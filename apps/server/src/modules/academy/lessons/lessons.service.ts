import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import sanitizeHtml from 'sanitize-html';
import { hasActiveCourseAccess } from '../access';

const lessonHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'iframe', 'h1', 'h2', 'u'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'title', 'loading', 'allowfullscreen', 'style', 'frameborder', 'allow'],
    '*': ['style'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
  allowedSchemes: ['http', 'https', 'mailto'],
};

const sanitizeLessonData = (data: Record<string, unknown>) => ({
  ...data,
  ...(typeof data.contentHtml === 'string' ? { contentHtml: sanitizeHtml(data.contentHtml, lessonHtmlOptions) } : {}),
  ...(typeof data.transcriptHtml === 'string' ? { transcriptHtml: sanitizeHtml(data.transcriptHtml, lessonHtmlOptions) } : {}),
});

export const getLessonBySlug = async (courseSlug: string, lessonSlug: string, userId: string, isAdmin = false) => {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, status: true, accessDays: true },
  });

  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  if (course.status !== 'PUBLISHED') throw new AppError('Kurs nie jest dostępny', 403);

  const enrollment = isAdmin ? null : await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (!isAdmin && !hasActiveCourseAccess(enrollment, course.accessDays)) throw new AppError('Dostęp do kursu wygasł lub wymaga zakupu', 403);

  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, module: { courseId: course.id } },
    include: {
      module: {
        select: { courseId: true, title: true },
      },
      quiz: {
        include: {
          questions: {
            include: { options: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);

  const [userProgress, notes] = await Promise.all([
    prisma.userLessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: lesson.id } } }),
    prisma.lessonNote.findMany({ where: { userId, lessonId: lesson.id }, orderBy: { updatedAt: 'desc' } }),
  ]);

  // Strip isCorrect from options for non-admin requests
  if (lesson.quiz) {
    const quizAny = lesson.quiz as any;
    quizAny.questions = lesson.quiz.questions.map((q: any) => ({
      ...q,
      options: q.options.map(({ isCorrect: _ic, ...opt }: any) => opt),
    }));
  }

  return { ...lesson, userProgress, notes };
};

export const saveNote = async (userId: string, lessonId: string, content: string, videoTimestamp?: number) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  const enrolled = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
  if (!hasActiveCourseAccess(enrolled, lesson.module.course.accessDays)) throw new AppError('Nie masz aktywnego dostępu do tej lekcji', 403);
  const existing = await prisma.lessonNote.findFirst({ where: { userId, lessonId } });
  if (existing) return prisma.lessonNote.update({ where: { id: existing.id }, data: { content, videoTimestamp } });
  return prisma.lessonNote.create({ data: { userId, lessonId, content, videoTimestamp } });
};

export const deleteNote = async (userId: string, lessonId: string) => {
  await prisma.lessonNote.deleteMany({ where: { userId, lessonId } });
};

export const createLesson = async (moduleId: string, data: Record<string, unknown>) => {
  return prisma.lesson.create({ data: { moduleId, ...sanitizeLessonData(data) } as any });
};

export const updateLesson = async (id: string, data: Record<string, unknown>) => {
  return prisma.lesson.update({ where: { id }, data: sanitizeLessonData(data) as any });
};

export const deleteLesson = async (id: string) => {
  await prisma.lesson.delete({ where: { id } });
};
