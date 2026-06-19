import { prisma } from '../../../config/prisma';
import { issueCertificate } from '../certificates/certificates.service';

export const markLessonComplete = async (userId: string, lessonId: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseId: true } } },
  });

  if (!lesson) return;

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

export const updateVideoProgress = async (userId: string, lessonId: string, watchedSeconds: number) => {
  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { watchedSeconds },
    create: { userId, lessonId, watchedSeconds },
  });
};

export const getUserCourseProgress = async (userId: string, courseId: string) => {
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
