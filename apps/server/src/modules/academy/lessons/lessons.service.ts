import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import sanitizeHtml from 'sanitize-html';

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

const sanitizeLessonData = (data: Record<string, unknown>) => typeof data.contentHtml === 'string'
  ? { ...data, contentHtml: sanitizeHtml(data.contentHtml, lessonHtmlOptions) }
  : data;

export const getLessonBySlug = async (courseSlug: string, lessonSlug: string, userId: string, isAdmin = false) => {
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    select: { id: true, status: true },
  });

  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  if (course.status !== 'PUBLISHED') throw new AppError('Kurs nie jest dostępny', 403);

  if (!isAdmin && !await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } })) throw new AppError('Ten kurs zostanie odblokowany po zakupie', 403);

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

  let userProgress = null;
  userProgress = await prisma.userLessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId: lesson.id } } });

  // Strip isCorrect from options for non-admin requests
  if (lesson.quiz) {
    const quizAny = lesson.quiz as any;
    quizAny.questions = lesson.quiz.questions.map((q: any) => ({
      ...q,
      options: q.options.map(({ isCorrect: _ic, ...opt }: any) => opt),
    }));
  }

  return { ...lesson, userProgress };
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
