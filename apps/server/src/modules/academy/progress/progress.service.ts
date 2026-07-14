import { prisma } from '../../../config/prisma';
import { issueCertificate } from '../certificates/certificates.service';
import { AppError } from '../../../middleware/error.middleware';

const requireEnrollment = async (userId: string, courseId: string, isAdmin = false) => {
  if (isAdmin) return;
  const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) throw new AppError('Kup kurs, aby zapisywać postęp', 403);
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
