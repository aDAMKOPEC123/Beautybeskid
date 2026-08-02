import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const RESERVED_SLUGS = ['quiz'];

// ── Public ──────────────────────────────────────────────────

export async function listPublishedRegions() {
  return prisma.skinAtlasRegion.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { conditions: { where: { published: true } } } } },
  });
}

export async function getRegionBySlug(slug: string) {
  const region = await prisma.skinAtlasRegion.findUnique({
    where: { slug },
    include: {
      conditions: {
        where: { published: true },
        orderBy: { order: 'asc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          _count: { select: { quizQuestions: true } },
        },
      },
    },
  });
  if (!region || !region.published) throw new AppError('Region nie znaleziony', 404);
  return region;
}

export async function getConditionBySlug(slug: string) {
  const condition = await prisma.skinAtlasCondition.findUnique({
    where: { slug },
    include: {
      region: { select: { slug: true, name: true } },
      images: { orderBy: { order: 'asc' } },
      relatedCourse: { select: { id: true, title: true, slug: true, price: true, status: true } },
      _count: { select: { quizQuestions: true } },
    },
  });
  if (!condition || !condition.published) throw new AppError('Problem skórny nie znaleziony', 404);
  return condition;
}

export async function getQuizQuestions(regionSlug: string | null) {
  const where = regionSlug
    ? { condition: { region: { slug: regionSlug, published: true }, published: true } }
    : { condition: { region: { published: true }, published: true } };

  return prisma.skinAtlasQuizQuestion.findMany({
    where,
    include: { answers: { orderBy: { order: 'asc' } }, condition: { select: { name: true, slug: true } } },
    orderBy: { order: 'asc' },
  });
}

export async function submitQuizAttempt(
  userId: string,
  regionSlug: string | null,
  answers: { questionId: string; selectedAnswerId: string }[]
) {
  const questionIds = answers.map(a => a.questionId);
  const questions = await prisma.skinAtlasQuizQuestion.findMany({
    where: { id: { in: questionIds } },
    include: { answers: true },
  });

  let score = 0;
  const detailedAnswers = answers.map(a => {
    const q = questions.find(q => q.id === a.questionId);
    const correctAnswer = q?.answers.find(ans => ans.isCorrect);
    const correct = correctAnswer?.id === a.selectedAnswerId;
    if (correct) score++;
    return { questionId: a.questionId, selectedAnswerId: a.selectedAnswerId, correct };
  });

  return prisma.skinAtlasQuizAttempt.create({
    data: {
      userId,
      regionSlug,
      score,
      maxScore: answers.length,
      answers: detailedAnswers,
    },
  });
}

// ── Admin ───────────────────────────────────────────────────

export async function adminListRegions() {
  return prisma.skinAtlasRegion.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { conditions: true } } },
  });
}

export async function adminCreateRegion(data: Record<string, any>) {
  if (!data.name?.trim()) throw new AppError('Uzupełnij nazwę regionu', 400);
  if (!data.slug?.trim()) throw new AppError('Uzupełnij slug', 400);
  if (RESERVED_SLUGS.includes(data.slug)) throw new AppError('Slug "quiz" jest zarezerwowany', 400);
  return prisma.skinAtlasRegion.create({
    data: {
      name: data.name.trim(),
      slug: data.slug.trim(),
      thumbnailUrl: data.thumbnailUrl || null,
      hotspotX: data.hotspotX ?? 50,
      hotspotY: data.hotspotY ?? 50,
      order: data.order ?? 0,
      published: data.published ?? false,
    },
  });
}

export async function adminUpdateRegion(id: string, data: Record<string, any>) {
  const existing = await prisma.skinAtlasRegion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Region nie znaleziony', 404);
  if (data.slug && RESERVED_SLUGS.includes(data.slug)) throw new AppError('Slug "quiz" jest zarezerwowany', 400);
  return prisma.skinAtlasRegion.update({ where: { id }, data });
}

export async function adminDeleteRegion(id: string) {
  const existing = await prisma.skinAtlasRegion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Region nie znaleziony', 404);
  return prisma.skinAtlasRegion.delete({ where: { id } });
}

export async function adminCreateCondition(data: Record<string, any>) {
  if (!data.name?.trim()) throw new AppError('Uzupełnij nazwę', 400);
  if (!data.slug?.trim()) throw new AppError('Uzupełnij slug', 400);
  if (!data.regionId) throw new AppError('Wybierz region', 400);
  if (!data.description?.trim() || data.description.trim().length < 10)
    throw new AppError('Opis musi mieć min. 10 znaków', 400);
  return prisma.skinAtlasCondition.create({
    data: {
      regionId: data.regionId,
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description.trim(),
      causes: data.causes?.trim() || '',
      treatments: data.treatments?.trim() || '',
      contraindications: data.contraindications?.trim() || '',
      order: data.order ?? 0,
      published: data.published ?? false,
      relatedCourseId: data.relatedCourseId || null,
    },
  });
}

export async function adminUpdateCondition(id: string, data: Record<string, any>) {
  const existing = await prisma.skinAtlasCondition.findUnique({ where: { id } });
  if (!existing) throw new AppError('Problem skórny nie znaleziony', 404);
  return prisma.skinAtlasCondition.update({ where: { id }, data });
}

export async function adminDeleteCondition(id: string) {
  const existing = await prisma.skinAtlasCondition.findUnique({ where: { id } });
  if (!existing) throw new AppError('Problem skórny nie znaleziony', 404);
  return prisma.skinAtlasCondition.delete({ where: { id } });
}

export async function adminCreateQuizQuestion(data: Record<string, any>) {
  if (!data.conditionId) throw new AppError('Wybierz problem skórny', 400);
  if (!data.questionText?.trim()) throw new AppError('Uzupełnij treść pytania', 400);
  if (!data.answers?.length || data.answers.length < 2) throw new AppError('Dodaj min. 2 odpowiedzi', 400);
  if (!data.answers.some((a: any) => a.isCorrect)) throw new AppError('Zaznacz poprawną odpowiedź', 400);

  return prisma.skinAtlasQuizQuestion.create({
    data: {
      conditionId: data.conditionId,
      questionText: data.questionText.trim(),
      questionImageUrl: data.questionImageUrl || null,
      explanation: data.explanation?.trim() || '',
      order: data.order ?? 0,
      answers: {
        create: data.answers.map((a: any, i: number) => ({
          text: a.text.trim(),
          isCorrect: a.isCorrect ?? false,
          order: i,
        })),
      },
    },
    include: { answers: { orderBy: { order: 'asc' } } },
  });
}

export async function adminDeleteQuizQuestion(id: string) {
  const existing = await prisma.skinAtlasQuizQuestion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Pytanie nie znalezione', 404);
  return prisma.skinAtlasQuizQuestion.delete({ where: { id } });
}

export async function adminAddImage(data: Record<string, any>) {
  if (!data.conditionId) throw new AppError('Wybierz problem skórny', 400);
  if (!data.url) throw new AppError('Brak URL zdjęcia', 400);
  return prisma.skinAtlasImage.create({
    data: {
      conditionId: data.conditionId,
      url: data.url,
      alt: data.alt || '',
      severity: data.severity || 'MILD',
      order: data.order ?? 0,
    },
  });
}

export async function adminDeleteImage(id: string) {
  return prisma.skinAtlasImage.delete({ where: { id } });
}
