import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { issueCertificate } from '../certificates/certificates.service';

const stripCorrect = (options: { isCorrect: boolean; [key: string]: unknown }[]) =>
  options.map(({ isCorrect: _ic, ...opt }) => opt);

export const getQuizForLesson = async (lessonId: string) => {
  const quiz = await prisma.academyQuiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quiz) throw new AppError('Brak quizu dla tej lekcji', 404);
  if (!quiz.isPublished) throw new AppError('Quiz nie jest opublikowany', 403);

  return {
    ...quiz,
    questions: quiz.questions.map((q) => ({ ...q, options: stripCorrect(q.options) })),
  };
};

export const listStandaloneQuizzes = async (userId: string) => {
  const quizzes = await prisma.academyQuiz.findMany({
    where: { lessonId: null, isPublished: true },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      passingScore: true,
      maxAttempts: true,
      timeLimitMinutes: true,
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const attempts = await prisma.academyQuizAttempt.findMany({
    where: { userId, quizId: { in: quizzes.map(quiz => quiz.id) } },
    select: { id: true, quizId: true, score: true, passed: true, completedAt: true },
    orderBy: { completedAt: 'desc' },
  });
  return quizzes.map(quiz => ({ ...quiz, attempts: attempts.filter(attempt => attempt.quizId === quiz.id).slice(0, 5) }));
};

export const getStandaloneQuiz = async (quizId: string) => {
  const quiz = await prisma.academyQuiz.findUnique({
    where: { id: quizId, lessonId: undefined },
    include: {
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quiz || quiz.lessonId !== null) throw new AppError('Nie znaleziono quizu', 404);
  if (!quiz.isPublished) throw new AppError('Quiz nie jest opublikowany', 403);

  return {
    ...quiz,
    questions: (quiz as any).questions.map((q: any) => ({ ...q, options: stripCorrect(q.options) })),
  };
};

export const submitAttempt = async (
  userId: string,
  quizId: string,
  answers: { questionId: string; selectedOptionIds: string[] }[]
) => {
  const quiz = await prisma.academyQuiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!quiz) throw new AppError('Nie znaleziono quizu', 404);

  // Check attempt limit
  const recentAttempts = await prisma.academyQuizAttempt.count({
    where: {
      userId,
      quizId,
      startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentAttempts >= quiz.maxAttempts) {
    throw new AppError(`Przekroczono limit ${quiz.maxAttempts} prób w ciągu 24 godzin`, 429);
  }

  // Grade answers
  let correct = 0;
  const gradedResults: { questionId: string; isCorrect: boolean; correctOptionIds: string[] }[] = [];

  for (const question of quiz.questions) {
    const answer = answers.find((a) => a.questionId === question.id);
    const selectedIds = answer?.selectedOptionIds ?? [];
    const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

    const isCorrect =
      selectedIds.length === correctIds.length &&
      correctIds.every((id) => selectedIds.includes(id));

    if (isCorrect) correct++;
    gradedResults.push({ questionId: question.id, isCorrect, correctOptionIds: correctIds });
  }

  const total = quiz.questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.academyQuizAttempt.create({
    data: {
      userId,
      quizId,
      score,
      passed,
      answers: answers as any,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  let certificate = null;
  if (passed) {
    const existing = await prisma.academyCertificate.findFirst({
      where: { userId, quizId },
    });
    if (!existing) {
      certificate = await issueCertificate(userId, { quizId });
    } else {
      certificate = existing;
    }
  }

  return { score, passed, gradedResults, attemptId: attempt.id, certificate };
};

// Admin CRUD
export const adminListQuizzes = async () => {
  return prisma.academyQuiz.findMany({
    include: {
      _count: { select: { questions: true, attempts: true } },
      lesson: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const adminGetQuiz = async (id: string) => {
  const quiz = await prisma.academyQuiz.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  if (!quiz) throw new AppError('Nie znaleziono quizu', 404);
  return quiz;
};

export const createQuiz = async (data: Record<string, unknown>) => {
  return prisma.academyQuiz.create({ data: data as any });
};

export const updateQuiz = async (id: string, data: Record<string, unknown>) => {
  return prisma.academyQuiz.update({ where: { id }, data: data as any });
};

export const deleteQuiz = async (id: string) => {
  await prisma.academyQuiz.delete({ where: { id } });
};

export const createQuestion = async (
  quizId: string,
  data: { text: string; type: string; order?: number; explanation?: string; options: { text: string; isCorrect: boolean; order?: number }[] }
) => {
  const { options, ...questionData } = data;
  return prisma.academyQuizQuestion.create({
    data: {
      quizId,
      ...questionData as any,
      options: { create: options },
    },
    include: { options: true },
  });
};

export const updateQuestion = async (questionId: string, data: Record<string, unknown>) => {
  return prisma.academyQuizQuestion.update({ where: { id: questionId }, data: data as any });
};

export const deleteQuestion = async (questionId: string) => {
  await prisma.academyQuizQuestion.delete({ where: { id: questionId } });
};
