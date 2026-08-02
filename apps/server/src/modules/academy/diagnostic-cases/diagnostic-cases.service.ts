import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

// ── Access check ────────────────────────────────────────────

async function requireCourseAccess(userId: string, courseSlug: string) {
  const enrollment = await prisma.academyEnrollment.findFirst({
    where: { userId, course: { slug: courseSlug } },
  });
  if (!enrollment) throw new AppError('Brak dostępu do tego kursu', 403);
}

// ── Public ──────────────────────────────────────────────────

export async function listForCourse(userId: string, courseSlug: string) {
  await requireCourseAccess(userId, courseSlug);
  return prisma.diagnosticCaseStudy.findMany({
    where: { course: { slug: courseSlug }, published: true },
    orderBy: { order: 'asc' },
    select: {
      id: true, title: true, description: true, thumbnailUrl: true,
      difficulty: true, clientName: true, clientAge: true,
      _count: { select: { steps: true, attempts: true } },
    },
  });
}

export async function getCaseStudy(userId: string, id: string) {
  const caseStudy = await prisma.diagnosticCaseStudy.findUnique({
    where: { id },
    include: {
      course: { select: { slug: true } },
      steps: {
        orderBy: { order: 'asc' },
        include: {
          answers: { orderBy: { order: 'asc' } },
          images: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  if (!caseStudy || !caseStudy.published) throw new AppError('Case study nie znalezione', 404);
  if (caseStudy.course) await requireCourseAccess(userId, caseStudy.course.slug);
  return caseStudy;
}

export async function submitAttempt(
  userId: string,
  caseStudyId: string,
  stepAnswers: { stepId: string; selectedAnswerIds: string[] }[]
) {
  const caseStudy = await prisma.diagnosticCaseStudy.findUnique({
    where: { id: caseStudyId },
    include: {
      course: { select: { slug: true } },
      steps: { include: { answers: true } },
    },
  });
  if (!caseStudy || !caseStudy.published) throw new AppError('Case study nie znalezione', 404);
  if (caseStudy.course) await requireCourseAccess(userId, caseStudy.course.slug);

  const scorableSteps = caseStudy.steps.filter(s => s.type !== 'RESULT' && s.answers.length > 0);
  let score = 0;

  const detailedAnswers = stepAnswers.map(sa => {
    const step = scorableSteps.find(s => s.id === sa.stepId);
    if (!step) return { stepId: sa.stepId, selectedAnswerIds: sa.selectedAnswerIds, correct: false };
    const correctIds = step.answers.filter(a => a.isCorrect).map(a => a.id);
    const correct = correctIds.length === sa.selectedAnswerIds.length
      && correctIds.every(id => sa.selectedAnswerIds.includes(id));
    if (correct) score++;
    return { stepId: sa.stepId, selectedAnswerIds: sa.selectedAnswerIds, correct };
  });

  return prisma.diagnosticCaseAttempt.create({
    data: {
      caseStudyId,
      userId,
      score,
      maxScore: scorableSteps.length,
      completedAt: new Date(),
      answers: detailedAnswers,
    },
  });
}

// ── Admin ───────────────────────────────────────────────────

export async function adminList() {
  return prisma.diagnosticCaseStudy.findMany({
    orderBy: { order: 'asc' },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { steps: true, attempts: true } },
    },
  });
}

export async function adminGet(id: string) {
  const cs = await prisma.diagnosticCaseStudy.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          answers: { orderBy: { order: 'asc' } },
          images: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  if (!cs) throw new AppError('Case study nie znalezione', 404);
  return cs;
}

export async function adminCreateCaseStudy(data: Record<string, any>) {
  if (!data.title?.trim()) throw new AppError('Uzupełnij tytuł', 400);
  if (!data.clientName?.trim()) throw new AppError('Uzupełnij imię klientki', 400);
  if (!data.steps?.length || data.steps.length < 2) throw new AppError('Dodaj min. 2 kroki', 400);
  if (data.steps[data.steps.length - 1].type !== 'RESULT')
    throw new AppError('Ostatni krok musi być typu WYNIK', 400);

  return prisma.diagnosticCaseStudy.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      thumbnailUrl: data.thumbnailUrl || null,
      difficulty: data.difficulty || 'MEDIUM',
      regionSlug: data.regionSlug || null,
      courseId: data.courseId || null,
      published: data.published ?? false,
      order: data.order ?? 0,
      clientName: data.clientName.trim(),
      clientAge: data.clientAge || 0,
      clientDescription: data.clientDescription?.trim() || '',
      steps: {
        create: data.steps.map((step: any, i: number) => ({
          type: step.type,
          content: step.content?.trim() || '',
          question: step.question?.trim() || null,
          multiSelect: step.multiSelect ?? false,
          order: i,
          answers: step.answers?.length ? {
            create: step.answers.map((a: any, j: number) => ({
              text: a.text.trim(),
              isCorrect: a.isCorrect ?? false,
              explanation: a.explanation?.trim() || null,
              order: j,
            })),
          } : undefined,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { answers: { orderBy: { order: 'asc' } }, images: { orderBy: { order: 'asc' } } },
      },
    },
  });
}

export async function adminUpdateCaseStudy(id: string, data: Record<string, any>) {
  const existing = await prisma.diagnosticCaseStudy.findUnique({ where: { id } });
  if (!existing) throw new AppError('Case study nie znalezione', 404);
  const { steps, ...rest } = data;
  return prisma.diagnosticCaseStudy.update({ where: { id }, data: rest });
}

export async function adminDeleteCaseStudy(id: string) {
  const existing = await prisma.diagnosticCaseStudy.findUnique({ where: { id } });
  if (!existing) throw new AppError('Case study nie znalezione', 404);
  return prisma.diagnosticCaseStudy.delete({ where: { id } });
}

export async function adminGetStats(id: string) {
  const attempts = await prisma.diagnosticCaseAttempt.findMany({
    where: { caseStudyId: id, completedAt: { not: null } },
    select: { score: true, maxScore: true },
  });
  const total = attempts.length;
  const avgScore = total > 0
    ? attempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / total
    : 0;
  return { totalAttempts: total, averageScorePercent: Math.round(avgScore) };
}
