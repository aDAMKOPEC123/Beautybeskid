import { prisma } from '../../../config/prisma';
import { issueCertificate } from '../certificates/certificates.service';
import { AppError } from '../../../middleware/error.middleware';
import { hasActiveCourseAccess } from '../access';

const requireEnrollment = async (userId: string, courseId: string, isAdmin = false) => {
  if (isAdmin) return;
  const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, include: { course: { select: { accessDays: true } } } });
  if (!hasActiveCourseAccess(enrollment, enrollment?.course.accessDays)) throw new AppError('Kup kurs lub odnow dostęp, aby zapisywać postęp', 403);
};

const updateLearningStreak = async (userId: string) => {
  const goal = await prisma.academyLearningGoal.upsert({ where: { userId }, create: { userId }, update: {} });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const previous = goal.lastActivityDate ? new Date(goal.lastActivityDate) : null;
  previous?.setHours(0, 0, 0, 0);
  if (previous?.getTime() === today.getTime()) return;
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const currentStreak = previous?.getTime() === yesterday.getTime() ? goal.currentStreak + 1 : 1;
  await prisma.academyLearningGoal.update({ where: { userId }, data: { currentStreak, longestStreak: Math.max(goal.longestStreak, currentStreak), lastActivityDate: new Date() } });
};

export const markLessonComplete = async (userId: string, lessonId: string, isAdmin = false) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) return;
  await requireEnrollment(userId, lesson.module.courseId, isAdmin);

  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { completed: true, completedAt: new Date() },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
  });
  await updateLearningStreak(userId);

  const courseId = lesson.module.courseId;

  // Recalculate course progress
  const allLessons = await prisma.lesson.findMany({
    where: { module: { courseId }, isRequired: true },
    select: { id: true },
  });

  const completedCount = await prisma.userLessonProgress.count({
    where: {
      userId,
      lessonId: { in: allLessons.map((l) => l.id) },
      completed: true,
    },
  });

  const percentComplete = allLessons.length > 0
    ? Math.round((completedCount / allLessons.length) * 100)
    : 0;

  const isComplete = percentComplete === 100;

  await prisma.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {
      percentComplete,
      completedAt: isComplete ? new Date() : null,
    },
    create: {
      userId,
      courseId,
      percentComplete,
      completedAt: isComplete ? new Date() : null,
    },
  });

  if (isComplete) {
    // Check if certificate already issued (guard against race condition)
    const existing = await prisma.academyCertificate.findFirst({
      where: { userId, courseId },
    });
    if (!existing) {
      await issueCertificate(userId, { courseId });
    }
  }

  return { percentComplete, lessonCompleted: true };
};

export const updateVideoProgress = async (userId: string, lessonId: string, watchedSeconds: number, isAdmin = false) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true } } } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  await requireEnrollment(userId, lesson.module.courseId, isAdmin);
  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { watchedSeconds },
    create: { userId, lessonId, watchedSeconds },
  });
};

export const getUserCourseProgress = async (userId: string, courseId: string, isAdmin = false) => {
  await requireEnrollment(userId, courseId, isAdmin);
  return prisma.userCourseProgress.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
};

export const getMyCourses = async (userId: string) => {
  return prisma.userCourseProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          difficulty: true,
          estimatedMinutes: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });
};

export const getLearningDashboard = async (userId: string) => {
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const [goal, enrollments, lessonProgress, notes] = await Promise.all([
    prisma.academyLearningGoal.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.academyEnrollment.findMany({ where: { userId }, include: { course: { include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } } } } }),
    prisma.userLessonProgress.findMany({ where: { userId }, include: { lesson: { include: { module: { include: { course: { select: { title: true, slug: true } } } } } } }, orderBy: { completedAt: 'desc' } }),
    prisma.lessonNote.findMany({ where: { userId }, include: { lesson: { include: { module: { include: { course: { select: { title: true, slug: true } } } } } } }, orderBy: { updatedAt: 'desc' } }),
  ]);
  const completedIds = new Set(lessonProgress.filter(item => item.completed).map(item => item.lessonId));
  const nextSteps = enrollments.map(({ course }) => {
    const lessons = course.modules.flatMap(module => module.lessons);
    const next = lessons.find(lesson => !completedIds.has(lesson.id));
    const completedModules = course.modules.filter(module => module.lessons.length > 0 && module.lessons.every(lesson => completedIds.has(lesson.id))).length;
    return { courseId: course.id, courseTitle: course.title, courseSlug: course.slug, completedModules, moduleCount: course.modules.length, nextLesson: next ? { title: next.title, slug: next.slug } : null };
  });
  const weeklyMinutes = lessonProgress.filter(item => item.completedAt && item.completedAt >= weekStart).reduce((sum, item) => sum + item.lesson.estimatedMinutes, 0);
  return { goal, weeklyMinutes, nextSteps, recentActivity: lessonProgress.slice(0, 10), notes };
};

export const updateLearningGoal = async (userId: string, weeklyMinutesGoal: number) => {
  if (!Number.isInteger(weeklyMinutesGoal) || weeklyMinutesGoal < 15 || weeklyMinutesGoal > 1000) throw new AppError('Cel musi wynosić od 15 do 1000 minut', 400);
  return prisma.academyLearningGoal.upsert({ where: { userId }, create: { userId, weeklyMinutesGoal }, update: { weeklyMinutesGoal } });
};
