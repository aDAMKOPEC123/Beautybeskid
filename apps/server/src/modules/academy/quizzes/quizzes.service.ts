import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { issueCertificate } from '../certificates/certificates.service';
import { hasActiveCourseAccess } from '../access';

const stripCorrect = (options: { isCorrect: boolean; [key: string]: unknown }[]) =>
  options.map(({ isCorrect: _ic, ...opt }) => opt);

export const getQuizForLesson = async (lessonId: string, userId: string, isAdmin = false) => {
  const quiz = await prisma.academyQuiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
      lesson: { select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } },
    },
  });

  if (!quiz) throw new AppError('Brak quizu dla tej lekcji', 404);
  if (!quiz.isPublished) throw new AppError('Quiz nie jest opublikowany', 403);

  if (!isAdmin && quiz.lesson) {
    const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: quiz.lesson.module.courseId } } });
    if (!hasActiveCourseAccess(enrollment, quiz.lesson.module.course.accessDays)) throw new AppError('Kup kurs, aby uzyskać dostęp do quizu', 403);
  }

  const { lesson: _lesson, ...quizData } = quiz;
  return {
    ...quizData,
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
    where: { id: quizId },
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

const QUIZ_FIELDS = ['title', 'description', 'thumbnailUrl', 'passingScore', 'maxAttempts', 'timeLimitMinutes', 'isPublished', 'lessonId'] as const;
const pickQuizFields = (data: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of QUIZ_FIELDS) if (data[key] !== undefined) picked[key] = data[key];
  return picked;
};

export const createQuiz = async (data: Record<string, unknown>) => {
  return prisma.academyQuiz.create({ data: pickQuizFields(data) as any });
};

export const updateQuiz = async (id: string, data: Record<string, unknown>) => {
  return prisma.academyQuiz.update({ where: { id }, data: pickQuizFields(data) as any });
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
      options: { create: normalizeOptions(options) },
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
};

const QUESTION_FIELDS = ['text', 'type', 'order', 'explanation'] as const;
const pickQuestionFields = (data: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of QUESTION_FIELDS) if (data[key] !== undefined) picked[key] = data[key];
  return picked;
};

type OptionInput = { text: string; isCorrect: boolean; order?: number };

const normalizeOptions = (raw: unknown): OptionInput[] => {
  if (!Array.isArray(raw)) throw new AppError('Odpowiedzi muszą być listą', 400);
  const options = raw
    .map((option, index) => {
      const value = option as Record<string, unknown>;
      return {
        text: String(value?.text ?? '').trim(),
        isCorrect: Boolean(value?.isCorrect),
        order: Number.isFinite(Number(value?.order)) ? Number(value?.order) : index,
      };
    })
    .filter((option) => option.text.length > 0);
  if (options.length < 2) throw new AppError('Pytanie musi mieć co najmniej dwie odpowiedzi', 400);
  if (!options.some((option) => option.isCorrect)) throw new AppError('Zaznacz co najmniej jedną poprawną odpowiedź', 400);
  return options;
};

// Odpowiedzi podmieniamy w całości — edycja pojedynczej opcji nie ma sensu,
// bo administrator zawsze redaguje pytanie razem z zestawem odpowiedzi.
export const updateQuestion = async (questionId: string, data: Record<string, unknown>) => {
  const fields = pickQuestionFields(data);
  if (data.options === undefined) {
    return prisma.academyQuizQuestion.update({ where: { id: questionId }, data: fields as any, include: { options: { orderBy: { order: 'asc' } } } });
  }
  const options = normalizeOptions(data.options);
  return prisma.$transaction(async (tx) => {
    await tx.academyQuizOption.deleteMany({ where: { questionId } });
    return tx.academyQuizQuestion.update({
      where: { id: questionId },
      data: { ...(fields as any), options: { create: options } },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  });
};

export const deleteQuestion = async (questionId: string) => {
  await prisma.academyQuizQuestion.delete({ where: { id: questionId } });
};
