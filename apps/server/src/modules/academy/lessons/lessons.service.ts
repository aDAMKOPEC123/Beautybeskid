import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import sanitizeHtml from 'sanitize-html';
import { hasActiveCourseAccess } from '../access';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const lessonHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'iframe', 'h1', 'h2', 'u'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    iframe: ['src', 'title', 'loading', 'allowfullscreen', 'frameborder', 'allow', 'style'],
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
      attachments: { orderBy: { order: 'asc' } },
      caseStudies: {
        include: { images: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
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
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  const enrolled = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
  if (!hasActiveCourseAccess(enrolled, lesson.module.course.accessDays)) throw new AppError('Nie masz aktywnego dostępu do tej lekcji', 403);
  await prisma.lessonNote.deleteMany({ where: { userId, lessonId } });
};

const LESSON_FIELDS = ['title', 'slug', 'type', 'order', 'estimatedMinutes', 'isRequired', 'videoId', 'contentHtml', 'transcriptHtml', 'thumbnailUrl'] as const;
const pickLessonFields = (data: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of LESSON_FIELDS) if (data[key] !== undefined) picked[key] = data[key];
  return sanitizeLessonData(picked);
};

export const createLesson = async (moduleId: string, data: Record<string, unknown>) => {
  return prisma.lesson.create({ data: { moduleId, ...pickLessonFields(data) } as any });
};

export const updateLesson = async (id: string, data: Record<string, unknown>) => {
  return prisma.lesson.update({ where: { id }, data: pickLessonFields(data) as any });
};

export const deleteLesson = async (id: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      attachments: { select: { fileName: true } },
      caseStudies: { select: { images: { select: { imageUrl: true } } } },
    },
  });
  await prisma.lesson.delete({ where: { id } });
  if (lesson) {
    for (const att of lesson.attachments) {
      await fs.unlink(path.join(UPLOADS_DIR, 'academy-attachments', att.fileName)).catch(() => {});
    }
    for (const cs of lesson.caseStudies) {
      for (const img of cs.images) {
        const filePath = img.imageUrl.startsWith('/uploads/') ? path.join(UPLOADS_DIR, img.imageUrl.replace('/uploads/', '')) : null;
        if (filePath) await fs.unlink(filePath).catch(() => {});
      }
    }
  }
};

// ---- Attachments ----

export const addAttachment = async (lessonId: string, file: Express.Multer.File, description?: string) => {
  if (file.size === 0) throw new AppError('Plik jest pusty', 400);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOADS_DIR, 'academy-attachments');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), file.buffer);
  const count = await prisma.lessonAttachment.count({ where: { lessonId } });
  return prisma.lessonAttachment.create({
    data: { lessonId, fileName, originalName: file.originalname, fileSize: file.size, mimeType: file.mimetype, description: description?.trim() || null, order: count },
  });
};

export const deleteAttachment = async (id: string) => {
  const attachment = await prisma.lessonAttachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError('Nie znaleziono załącznika', 404);
  const filePath = path.join(UPLOADS_DIR, 'academy-attachments', attachment.fileName);
  await fs.unlink(filePath).catch(() => {});
  await prisma.lessonAttachment.delete({ where: { id } });
};

export const getAttachmentForDownload = async (lessonId: string, attachmentId: string, userId: string, isAdmin: boolean) => {
  const attachment = await prisma.lessonAttachment.findFirst({ where: { id: attachmentId, lessonId } });
  if (!attachment) throw new AppError('Nie znaleziono załącznika', 404);
  if (!isAdmin) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } });
    if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
    const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
    if (!hasActiveCourseAccess(enrollment, lesson.module.course.accessDays)) throw new AppError('Dostęp do materiałów wymaga zakupu kursu', 403);
  }
  return { filePath: path.join(UPLOADS_DIR, 'academy-attachments', attachment.fileName), originalName: attachment.originalName, mimeType: attachment.mimeType };
};

// ---- Case Studies ----

const CASE_STUDY_FIELDS = ['title', 'problemDescription', 'treatmentDescription', 'resultsDescription', 'order'] as const;
const pickCaseStudyFields = (data: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of CASE_STUDY_FIELDS) if (data[key] !== undefined) picked[key] = data[key];
  for (const key of ['problemDescription', 'treatmentDescription', 'resultsDescription'] as const) {
    if (typeof picked[key] === 'string') picked[key] = sanitizeHtml(picked[key] as string, lessonHtmlOptions);
  }
  return picked;
};

export const createCaseStudy = async (lessonId: string, data: Record<string, unknown>) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  return prisma.lessonCaseStudy.create({ data: { lessonId, ...pickCaseStudyFields(data) } as any });
};

export const updateCaseStudy = async (id: string, data: Record<string, unknown>) => {
  return prisma.lessonCaseStudy.update({ where: { id }, data: pickCaseStudyFields(data) as any });
};

export const deleteCaseStudy = async (id: string) => {
  const cs = await prisma.lessonCaseStudy.findUnique({ where: { id }, select: { images: { select: { imageUrl: true } } } });
  await prisma.lessonCaseStudy.delete({ where: { id } });
  if (cs) {
    for (const img of cs.images) {
      const filePath = img.imageUrl.startsWith('/uploads/') ? path.join(UPLOADS_DIR, img.imageUrl.replace('/uploads/', '')) : null;
      if (filePath) await fs.unlink(filePath).catch(() => {});
    }
  }
};

export const addCaseStudyImage = async (caseStudyId: string, file: Express.Multer.File, type: string, caption?: string) => {
  const cs = await prisma.lessonCaseStudy.findUnique({ where: { id: caseStudyId }, select: { id: true } });
  if (!cs) throw new AppError('Nie znaleziono case study', 404);
  if (!['BEFORE', 'AFTER', 'DURING'].includes(type)) throw new AppError('Typ zdjęcia musi być BEFORE, AFTER lub DURING', 400);
  const imageUrl = await processAndSaveImage(file.buffer, 'academy-case-studies');
  const count = await prisma.caseStudyImage.count({ where: { caseStudyId } });
  return prisma.caseStudyImage.create({
    data: { caseStudyId, imageUrl, type: type as any, caption: caption?.trim() || null, order: count },
  });
};

export const deleteCaseStudyImage = async (id: string) => {
  await prisma.caseStudyImage.delete({ where: { id } });
};

// ---- Comments ----

export const getComments = async (lessonId: string, userId: string, isAdmin: boolean) => {
  if (!isAdmin) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } });
    if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
    const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
    if (!hasActiveCourseAccess(enrollment, lesson.module.course.accessDays)) throw new AppError('Komentarze dostępne po zakupie kursu', 403);
  }
  const comments = await prisma.lessonComment.findMany({
    where: { lessonId, parentId: null },
    include: {
      user: { select: { id: true, name: true, role: true } },
      replies: {
        where: { isDeleted: false },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return comments.map(c => c.isDeleted ? { ...c, content: '[Komentarz usunięty]', user: { id: '', name: '', role: 'USER' } } : c);
};

export const addComment = async (lessonId: string, userId: string, content: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } },
  });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);

  const user = await prisma.academyUser.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.module.courseId } },
    });
    if (!hasActiveCourseAccess(enrollment, lesson.module.course.accessDays))
      throw new AppError('Komentowanie wymaga aktywnego dostępu do kursu', 403);
  }

  return prisma.lessonComment.create({
    data: {
      lessonId, userId,
      content: sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }),
      isAdminReply: isAdmin,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
};

export const addReply = async (commentId: string, userId: string, content: string) => {
  const parent = await prisma.lessonComment.findUnique({
    where: { id: commentId },
    select: { id: true, lessonId: true, parentId: true },
  });
  if (!parent) throw new AppError('Nie znaleziono komentarza', 404);
  if (parent.parentId) throw new AppError('Odpowiadanie na odpowiedzi nie jest dozwolone', 400);

  const lesson = await prisma.lesson.findUnique({
    where: { id: parent.lessonId },
    select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } },
  });

  const user = await prisma.academyUser.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson!.module.courseId } },
    });
    if (!hasActiveCourseAccess(enrollment, lesson!.module.course.accessDays))
      throw new AppError('Komentowanie wymaga aktywnego dostępu do kursu', 403);
  }

  return prisma.lessonComment.create({
    data: {
      lessonId: parent.lessonId, userId, parentId: commentId,
      content: sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }),
      isAdminReply: isAdmin,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
};

export const deleteComment = async (commentId: string, userId: string, isAdmin: boolean) => {
  const comment = await prisma.lessonComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError('Nie znaleziono komentarza', 404);
  if (!isAdmin && comment.userId !== userId) throw new AppError('Nie możesz usunąć cudzego komentarza', 403);
  await prisma.lessonComment.update({ where: { id: commentId }, data: { isDeleted: true } });
};
