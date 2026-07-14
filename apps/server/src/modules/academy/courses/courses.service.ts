import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

export const listPublished = async (userId?: string) => {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED', isActive: true },
    include: {
      modules: {
        include: {
          lessons: {
            select: { id: true, isRequired: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: { select: { modules: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!userId) return courses;

  const progressList = await prisma.userCourseProgress.findMany({
    where: { userId, courseId: { in: courses.map((c) => c.id) } },
    select: { courseId: true, percentComplete: true, completedAt: true },
  });

  const progressMap = new Map(progressList.map((p) => [p.courseId, p]));

  return courses.map((course) => ({
    ...course,
    lessonCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    progress: progressMap.get(course.id) ?? null,
  }));
};

export const getCourseBySlug = async (slug: string, userId?: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              estimatedMinutes: true,
              order: true,
              isRequired: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  if (course.status !== 'PUBLISHED') throw new AppError('Kurs nie jest dostępny', 403);

  if (!userId) return { ...course, userProgress: null, lessonProgress: [] };

  const [courseProgress, lessonProgressList] = await Promise.all([
    prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    }),
    prisma.userLessonProgress.findMany({
      where: {
        userId,
        lessonId: {
          in: course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
        },
      },
      select: { lessonId: true, completed: true, watchedSeconds: true },
    }),
  ]);

  return {
    ...course,
    userProgress: courseProgress,
    lessonProgress: lessonProgressList,
  };
};

export const adminListAll = async () => {
  return prisma.course.findMany({
    include: {
      _count: { select: { modules: true, progress: true } },
      modules: {
        include: {
          _count: { select: { lessons: true } },
          lessons: {
            include: { quiz: { select: { id: true, title: true, isPublished: true, _count: { select: { questions: true } } } } },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createCourse = async (data: {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes?: number;
  tags?: string[];
  thumbnailUrl?: string;
  status?: string;
}) => {
  return prisma.course.create({ data: data as any });
};

export const updateCourse = async (id: string, data: Record<string, unknown>) => {
  return prisma.course.update({ where: { id }, data: data as any });
};

export const deleteCourse = async (id: string) => {
  await prisma.course.delete({ where: { id } });
};

export const reorderModules = async (courseId: string, order: string[]) => {
  await Promise.all(
    order.map((moduleId, index) =>
      prisma.courseModule.update({ where: { id: moduleId }, data: { order: index } })
    )
  );
};

export const reorderLessons = async (moduleId: string, order: string[]) => {
  await Promise.all(
    order.map((lessonId, index) =>
      prisma.lesson.update({ where: { id: lessonId }, data: { order: index } })
    )
  );
};

export const createModule = async (courseId: string, data: { title: string; order?: number }) => {
  return prisma.courseModule.create({ data: { courseId, ...data } });
};

export const updateModule = async (moduleId: string, data: { title?: string; order?: number }) => {
  return prisma.courseModule.update({ where: { id: moduleId }, data });
};

export const deleteModule = async (moduleId: string) => {
  await prisma.courseModule.delete({ where: { id: moduleId } });
};

export const createCheckpoint = async (moduleId: string, data: { title: string; order?: number; passingScore?: number }) => {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.create({
      data: { moduleId, title: data.title, slug: `checkpoint-${Date.now()}`, type: 'QUIZ', order: data.order ?? 0 },
    });
    const quiz = await tx.academyQuiz.create({
      data: { lessonId: lesson.id, title: data.title, passingScore: data.passingScore ?? 70, isPublished: false },
    });
    return { ...lesson, quiz };
  });
};
