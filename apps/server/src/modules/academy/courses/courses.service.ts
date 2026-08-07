import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { hasActiveCourseAccess } from '../access';
import { resolvePublicPrice } from '../marketing/marketing.service';

export const listPublished = async (userId: string, isAdmin = false) => {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED', isActive: true },
    include: {
      modules: {
        include: {
          lessons: {
            select: { id: true, isRequired: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: { select: { modules: true } },
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const enrollmentRows = isAdmin ? [] : await prisma.academyEnrollment.findMany({ where: { userId }, select: { courseId: true, purchasedAt: true, accessExpiresAt: true } });
  const enrolled = isAdmin ? courses.map((course) => course.id) : enrollmentRows.filter((entry) => hasActiveCourseAccess(entry, courses.find(course => course.id === entry.courseId)?.accessDays)).map((entry) => entry.courseId);
  const purchasedCourses = courses.filter((course) => enrolled.includes(course.id));

  const progressList = await prisma.userCourseProgress.findMany({
    where: { userId, courseId: { in: purchasedCourses.map((c) => c.id) } },
    select: { courseId: true, percentComplete: true, completedAt: true, startedAt: true },
  });

  const progressMap = new Map(progressList.map((p) => [p.courseId, p]));

  return purchasedCourses.map((course) => ({
    ...course,
    lessonCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    progress: progressMap.get(course.id) ?? { percentComplete: 0, completedAt: null, startedAt: null },
  }));
};

export const listPublic = async () => {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED', isActive: true },
    include: {
      modules: { include: { lessons: { select: { id: true } } }, orderBy: { order: 'asc' } },
      priceHistory: { orderBy: { validFrom: 'asc' } },
      instructor: { select: { id: true, slug: true, name: true, title: true, shortBio: true, credentials: true, photoUrl: true } },
      _count: { select: { diagnosticCaseStudies: { where: { published: true } } } },
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return Promise.all(courses.map(async (course) => {
    const campaign = await resolvePublicPrice({ courseId: course.id, price: Number(course.price) });
    return { ...course, ...(campaign || {}), lowestPrice30Days: calculateLowestPriorPrice(course.priceHistory, Number(course.price), Boolean(course.compareAtPrice) || Boolean(campaign)), priceHistory: undefined, lessonCount: course.modules.reduce((sum, module) => sum + module.lessons.length, 0), modules: undefined };
  }));
};

export const getPublicCourse = async (slug: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: { include: { lessons: { select: { id: true, title: true, estimatedMinutes: true, type: true, videoId: true, contentHtml: true, transcriptHtml: true, thumbnailUrl: true } } }, orderBy: { order: 'asc' } },
      academyReviews: { where: { isApproved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      priceHistory: { orderBy: { validFrom: 'asc' } },
      instructor: { select: { id: true, slug: true, name: true, title: true, shortBio: true, fullBio: true, credentials: true, photoUrl: true } },
    },
  });
  if (!course || course.status !== 'PUBLISHED' || !course.isActive) throw new AppError('Nie znaleziono kursu', 404);
  const recommendedCourses = course.bundleGroup ? await prisma.course.findMany({
    where: { bundleGroup: course.bundleGroup, id: { not: course.id }, status: 'PUBLISHED', isActive: true },
    select: { id: true, slug: true, title: true, thumbnailUrl: true, price: true, isFree: true, difficulty: true },
    take: 3,
  }) : [];
  const bundles = await prisma.academyBundle.findMany({
    where: { isActive: true, courses: { some: { courseId: course.id } } },
    include: {
      courses: {
        include: { course: { select: { id: true, slug: true, title: true, thumbnailUrl: true, price: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  const campaign = await resolvePublicPrice({ courseId: course.id, price: Number(course.price) });
  // „Zweryfikowany zakup” musi wynikać z realnego zapisu na kurs, a nie być
  // wpisany na sztywno — po zwrocie zapis znika i znacznik ma zniknąć razem z nim.
  const reviewerEnrollments = course.academyReviews.length
    ? await prisma.academyEnrollment.findMany({
        where: { courseId: course.id, userId: { in: course.academyReviews.map((review) => review.userId) } },
        select: { userId: true },
      })
    : [];
  const verifiedReviewers = new Set(reviewerEnrollments.map((entry) => entry.userId));
  return {
    ...course,
    ...(campaign || {}),
    lowestPrice30Days: calculateLowestPriorPrice(course.priceHistory, Number(course.price), Boolean(course.compareAtPrice)),
    priceHistory: undefined,
    academyReviews: course.academyReviews.map((review) => ({ ...review, verifiedPurchase: verifiedReviewers.has(review.userId) })),
    recommendedCourses,
    bundles,
    previewLesson: course.previewLessonId ? course.modules.flatMap(module => module.lessons).find(lesson => lesson.id === course.previewLessonId) ?? null : null,
    modules: course.modules.map((module) => ({ id: module.id, title: module.title, lessonCount: module.lessons.length, estimatedMinutes: module.lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0) })),
  };
};

export const getPreviewLesson = async (slug: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, status: true, isActive: true, previewLessonId: true },
  });
  if (!course || course.status !== 'PUBLISHED' || !course.isActive) throw new AppError('Nie znaleziono kursu', 404);
  if (!course.previewLessonId) throw new AppError('Ten kurs nie ma lekcji próbnej', 404);

  const lesson = await prisma.lesson.findUnique({
    where: { id: course.previewLessonId },
    select: {
      id: true, title: true, slug: true, type: true,
      videoProvider: true, videoId: true,
      contentHtml: true, transcriptHtml: true,
      thumbnailUrl: true, estimatedMinutes: true,
    },
  });
  if (!lesson) throw new AppError('Lekcja próbna nie jest dostępna', 404);
  return lesson;
};

export const getCourseBySlug = async (slug: string, userId: string, isAdmin = false) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              estimatedMinutes: true,
              order: true,
              isRequired: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  if (course.status !== 'PUBLISHED') throw new AppError('Kurs nie jest dostępny', 403);

  const enrollment = isAdmin ? null : await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (!isAdmin && !hasActiveCourseAccess(enrollment, course.accessDays)) throw new AppError('Dostęp do kursu wygasł lub wymaga zakupu', 403);

  const [courseProgress, lessonProgressList] = await Promise.all([
    prisma.userCourseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    }),
    prisma.userLessonProgress.findMany({
      where: {
        userId,
        lessonId: {
          in: course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
        },
      },
      select: { lessonId: true, completed: true, watchedSeconds: true },
    }),
  ]);

  return {
    ...course,
    userProgress: courseProgress,
    lessonProgress: lessonProgressList,
  };
};

export const registerCourseInterest = async (userId: string, courseId: string) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED', isActive: true } });
  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  const enrolled = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (hasActiveCourseAccess(enrolled, course.accessDays)) return { status: 'ENROLLED' as const };

  if (course.isFree) {
    const now = new Date();
    const accessExpiresAt = course.accessDays ? new Date(now.getTime() + course.accessDays * 24 * 60 * 60 * 1000) : null;
    await prisma.academyEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, purchasedAt: now, accessExpiresAt },
      update: { purchasedAt: now, accessExpiresAt },
    });
    return { status: 'ENROLLED' as const };
  }
  return { status: 'CHECKOUT_REQUIRED' as const };
};

const bundleInclude = {
  courses: {
    include: { course: { select: { id: true, slug: true, title: true, thumbnailUrl: true, price: true, isFree: true, status: true, isActive: true } } },
    orderBy: { order: 'asc' as const },
  },
  priceHistory: { orderBy: { validFrom: 'desc' as const } },
};

export const calculateLowestPriorPrice = (history: { price: unknown; validFrom: Date }[], currentPrice: number, promoted: boolean) => {
  const sorted = [...history].sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
  const prior = promoted && sorted.length && Number(sorted.at(-1)!.price) === currentPrice ? sorted.slice(0, -1) : sorted;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const candidates = prior.filter((entry) => entry.validFrom.getTime() >= cutoff).map((entry) => Number(entry.price));
  const atCutoff = [...prior].reverse().find((entry) => entry.validFrom.getTime() < cutoff);
  if (atCutoff) candidates.push(Number(atCutoff.price));
  return candidates.length ? Math.min(...candidates) : currentPrice;
};

export const hasCompleteInstructionalLesson = (lessons: Array<{
  type: string;
  videoId?: string | null;
  contentHtml?: string | null;
  transcriptHtml?: string | null;
  estimatedMinutes: number;
}>) => lessons.some((lesson) =>
  (lesson.type === 'VIDEO' && Boolean(lesson.videoId?.trim()) && Boolean(lesson.transcriptHtml?.trim()) && lesson.estimatedMinutes > 0)
  || (lesson.type === 'TEXT' && String(lesson.contentHtml ?? '').replace(/<[^>]*>/g, '').trim().length >= 50 && lesson.estimatedMinutes > 0),
);

const withBundleLowestPrice = <T extends { price: unknown; priceHistory: { price: unknown; validFrom: Date }[] }>(bundle: T) => {
  return { ...bundle, lowestPrice30Days: calculateLowestPriorPrice(bundle.priceHistory, Number(bundle.price), Boolean((bundle as T & { compareAtPrice?: unknown }).compareAtPrice)), priceHistory: undefined };
};

export const listPublicBundles = async () => {
  const bundles = await prisma.academyBundle.findMany({
    where: { isActive: true, courses: { some: { course: { status: 'PUBLISHED', isActive: true } } } },
    include: bundleInclude,
    orderBy: [{ displayOrder: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
  return Promise.all(bundles.map(async bundle => { const campaign = await resolvePublicPrice({ bundleId: bundle.id, price: Number(bundle.price) }); return Object.assign(withBundleLowestPrice(bundle), campaign ?? {}); }));
};

export const getPublicBundle = async (slug: string) => {
  const bundle = await prisma.academyBundle.findFirst({ where: { slug, isActive: true }, include: bundleInclude });
  if (!bundle || bundle.courses.some(({ course }) => course.status !== 'PUBLISHED' || !course.isActive)) {
    throw new AppError('Nie znaleziono pakietu', 404);
  }
  const campaign = await resolvePublicPrice({ bundleId: bundle.id, price: Number(bundle.price) });
  return Object.assign(withBundleLowestPrice(bundle), campaign ?? {});
};

export const getSitemapEntries = async () => {
  const [courses, bundles] = await Promise.all([
    prisma.course.findMany({ where: { status: 'PUBLISHED', isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.academyBundle.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return { courses, bundles };
};

export const listFavorites = async (userId: string) => prisma.courseFavorite.findMany({
  where: { userId }, select: { courseId: true }, orderBy: { createdAt: 'desc' },
});

export const addFavorite = async (userId: string, courseId: string) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, status: 'PUBLISHED', isActive: true }, select: { id: true } });
  if (!course) throw new AppError('Nie znaleziono kursu', 404);
  return prisma.courseFavorite.upsert({ where: { userId_courseId: { userId, courseId } }, create: { userId, courseId }, update: {} });
};

export const removeFavorite = async (userId: string, courseId: string) => {
  await prisma.courseFavorite.deleteMany({ where: { userId, courseId } });
};

export const submitReview = async (userId: string, courseId: string, rating: number, content: string) => {
  const progress = await prisma.userCourseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!progress?.completedAt) throw new AppError('Opinię możesz dodać po ukończeniu kursu', 403);
  if (rating < 1 || rating > 5 || content.length < 10 || content.length > 1500) throw new AppError('Podaj ocenę 1–5 i opinię od 10 do 1500 znaków', 400);
  return prisma.academyCourseReview.upsert({ where: { userId_courseId: { userId, courseId } }, create: { userId, courseId, rating, content }, update: { rating, content, isApproved: false } });
};

export const adminListReviews = async () => prisma.academyCourseReview.findMany({ include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } }, orderBy: { createdAt: 'desc' } });
export const adminApproveReview = async (id: string, isApproved: boolean) => prisma.academyCourseReview.update({ where: { id }, data: { isApproved } });

const instructorData = (data: Record<string, unknown>) => {
  const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
  const slug = text(data.slug, 80).toLowerCase();
  const name = text(data.name, 120);
  const title = text(data.title, 160);
  const shortBio = text(data.shortBio, 600);
  if (!name || !title || !shortBio) throw new AppError('Podaj imię i nazwisko, tytuł oraz krótki opis prowadzącej', 400);
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new AppError('Adres (slug) może zawierać wyłącznie małe litery, cyfry i myślniki', 400);
  return {
    slug, name, title, shortBio,
    fullBio: text(data.fullBio, 4000) || shortBio,
    credentials: Array.isArray(data.credentials) ? data.credentials.map((value) => String(value).trim().slice(0, 80)).filter(Boolean) : [],
    photoUrl: text(data.photoUrl, 1000) || null,
    isActive: data.isActive !== false,
    displayOrder: Number(data.displayOrder) || 0,
  };
};

export const adminListInstructors = async () => prisma.academyInstructor.findMany({
  include: { _count: { select: { courses: true } } },
  orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
});
export const createInstructor = async (data: Record<string, unknown>) => prisma.academyInstructor.create({ data: instructorData(data) });
export const updateInstructor = async (id: string, data: Record<string, unknown>) => prisma.academyInstructor.update({ where: { id }, data: instructorData(data) });

export const deleteInstructor = async (id: string) => {
  // Kursy przypisanej prowadzącej straciłyby autora (FK ma SetNull), więc zamiast
  // usuwać, dezaktywujemy — bio zostaje i można je przywrócić.
  const linked = await prisma.course.count({ where: { instructorId: id } });
  if (linked) return prisma.academyInstructor.update({ where: { id }, data: { isActive: false } });
  return prisma.academyInstructor.delete({ where: { id } });
};

export const adminListAll = async () => {
  return prisma.course.findMany({
    include: {
      instructor: { select: { id: true, name: true } },
      _count: { select: { modules: true, progress: true } },
      modules: {
        include: {
          _count: { select: { lessons: true } },
          lessons: {
            include: {
              quiz: { select: { id: true, title: true, isPublished: true, _count: { select: { questions: true } } } },
              attachments: { orderBy: { order: 'asc' } },
              caseStudies: { include: { images: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  });
};

export const createCourse = async (data: {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedMinutes?: number;
  price?: number;
  compareAtPrice?: number | null;
  isFree?: boolean;
  tags?: string[];
  thumbnailUrl?: string;
  status?: string;
}) => {
  if (data.compareAtPrice != null && Number(data.compareAtPrice) <= Number(data.price ?? 0)) throw new AppError('Cena przed obniżką musi być wyższa od ceny sprzedaży', 400);
  if (data.status === 'PUBLISHED') throw new AppError('Najpierw utwórz program, lekcje i transkrypcje, a następnie opublikuj kurs', 400);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({ data: data as any });
    await tx.academyCoursePriceHistory.create({ data: { courseId: course.id, price: course.price } });
    return course;
  });
};

export const updateCourse = async (id: string, data: Record<string, unknown>) => {
  return prisma.$transaction(async (tx) => {
    const before = await tx.course.findUnique({ where: { id }, include: { modules: { include: { lessons: { select: { type: true, videoId: true, contentHtml: true, transcriptHtml: true, estimatedMinutes: true } } } } } });
    if (!before) throw new AppError('Nie znaleziono kursu', 404);
    const nextStatus = String(data.status ?? before.status);
    const nextPrice = Number(data.price ?? before.price);
    const rawCompareAt = data.compareAtPrice !== undefined ? data.compareAtPrice : before.compareAtPrice;
    const nextCompareAt = rawCompareAt == null ? null : Number(rawCompareAt);
    if (nextCompareAt != null && nextCompareAt <= nextPrice) throw new AppError('Cena przed obniżką musi być wyższa od ceny sprzedaży', 400);
    if (nextStatus === 'PUBLISHED') {
      const nextIsFree = Boolean(data.isFree ?? before.isFree);
      const nextComingSoon = Boolean(data.isComingSoon ?? before.isComingSoon);
      if (!nextIsFree && !nextComingSoon && nextPrice <= 0) throw new AppError('Opublikowany płatny kurs musi mieć cenę większą od zera albo status „w przygotowaniu”', 400);
      if (!nextComingSoon) {
        const lessons = before.modules.flatMap((module) => module.lessons);
        if (!hasCompleteInstructionalLesson(lessons)) throw new AppError('Przed sprzedażą dodaj co najmniej jedną kompletną lekcję wideo lub tekstową z czasem nauki', 400);
        const missingTranscripts = lessons.filter((lesson) => lesson.type === 'VIDEO' && lesson.videoId?.trim() && !lesson.transcriptHtml?.trim()).length;
        if (missingTranscripts) throw new AppError(`Uzupełnij transkrypcje dla ${missingTranscripts} lekcji wideo przed publikacją`, 400);
      }
    }
    const course = await tx.course.update({ where: { id }, data: data as any });
    if (course.price.comparedTo(before.price) !== 0) {
      await tx.academyCoursePriceHistory.create({ data: { courseId: course.id, price: course.price } });
    }
    return course;
  });
};

export const adminListBundles = async () => prisma.academyBundle.findMany({ include: bundleInclude, orderBy: { createdAt: 'desc' } });

type BundleInput = {
  title: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  accessDays?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  thumbnailUrl?: string | null;
  courseIds: string[];
};

const validateBundleInput = (data: BundleInput) => {
  if (!data.title?.trim() || !data.slug?.trim() || !data.description?.trim()) throw new AppError('Uzupełnij nazwę, adres i opis pakietu', 400);
  if (!Array.isArray(data.courseIds) || data.courseIds.length < 2) throw new AppError('Pakiet musi zawierać co najmniej dwa kursy', 400);
  if (!Number.isFinite(Number(data.price)) || Number(data.price) <= 0) throw new AppError('Cena pakietu musi być większa od zera', 400);
  if (data.compareAtPrice != null && Number(data.compareAtPrice) <= Number(data.price)) throw new AppError('Cena pakietu przed obniżką musi być wyższa od ceny sprzedaży', 400);
};

const validateBundleCourses = async (courseIds: string[]) => {
  const courses = await prisma.course.findMany({ where: { id: { in: courseIds }, status: 'PUBLISHED', isActive: true }, select: { id: true } });
  if (courses.length !== courseIds.length) throw new AppError('Pakiet może zawierać wyłącznie istniejące, opublikowane i aktywne kursy', 400);
};

export const createBundle = async (data: BundleInput) => {
  validateBundleInput(data);
  const courseIds = [...new Set(data.courseIds)];
  await validateBundleCourses(courseIds);
  return prisma.academyBundle.create({
    data: {
      title: data.title.trim(), slug: data.slug.trim(), description: data.description.trim(), price: data.price,
      compareAtPrice: data.compareAtPrice, accessDays: data.accessDays, isActive: data.isActive,
      isFeatured: data.isFeatured, displayOrder: Number(data.displayOrder)||0, thumbnailUrl: data.thumbnailUrl,
      courses: { create: courseIds.map((courseId, order) => ({ courseId, order })) },
      priceHistory: { create: { price: data.price } },
    },
    include: bundleInclude,
  });
};

export const updateBundle = async (id: string, data: BundleInput) => {
  validateBundleInput(data);
  const courseIds = [...new Set(data.courseIds)];
  await validateBundleCourses(courseIds);
  return prisma.$transaction(async (tx) => {
    const before = await tx.academyBundle.findUnique({ where: { id }, select: { price: true } });
    if (!before) throw new AppError('Nie znaleziono pakietu', 404);
    await tx.academyBundleCourse.deleteMany({ where: { bundleId: id } });
    const bundle = await tx.academyBundle.update({
      where: { id },
      data: {
        title: data.title.trim(), slug: data.slug.trim(), description: data.description.trim(), price: data.price,
        compareAtPrice: data.compareAtPrice, accessDays: data.accessDays, isActive: data.isActive,
        isFeatured: data.isFeatured, displayOrder: Number(data.displayOrder)||0, thumbnailUrl: data.thumbnailUrl,
        courses: { create: courseIds.map((courseId, order) => ({ courseId, order })) },
      },
      include: bundleInclude,
    });
    if (bundle.price.comparedTo(before.price) !== 0) await tx.academyBundlePriceHistory.create({ data: { bundleId: id, price: bundle.price } });
    return bundle;
  });
};

export const deleteBundle = async (id: string) => {
  const paidOrder = await prisma.academyOrder.findFirst({ where: { bundleId: id, status: 'PAID' }, select: { id: true } });
  if (paidOrder) return prisma.academyBundle.update({ where: { id }, data: { isActive: false } });
  return prisma.academyBundle.delete({ where: { id } });
};

export const deleteCourse = async (id: string) => {
  await prisma.course.delete({ where: { id } });
};

export const reorderModules = async (courseId: string, order: string[]) => {
  const modules = await prisma.courseModule.findMany({ where: { courseId }, select: { id: true } });
  const valid = new Set(modules.map((m) => m.id));
  if (order.some((id) => !valid.has(id))) throw new AppError('Podano moduł nienależący do tego kursu', 400);
  await Promise.all(
    order.map((moduleId, index) =>
      prisma.courseModule.update({ where: { id: moduleId }, data: { order: index } })
    )
  );
};

export const reorderLessons = async (moduleId: string, order: string[]) => {
  const lessons = await prisma.lesson.findMany({ where: { moduleId }, select: { id: true } });
  const valid = new Set(lessons.map((l) => l.id));
  if (order.some((id) => !valid.has(id))) throw new AppError('Podano lekcję nienależącą do tego modułu', 400);
  await Promise.all(
    order.map((lessonId, index) =>
      prisma.lesson.update({ where: { id: lessonId }, data: { order: index } })
    )
  );
};

export const createModule = async (courseId: string, data: { title: string; order?: number }) => {
  return prisma.courseModule.create({ data: { courseId, ...data } });
};

export const updateModule = async (moduleId: string, data: { title?: string; order?: number }) => {
  return prisma.courseModule.update({ where: { id: moduleId }, data });
};

export const deleteModule = async (moduleId: string) => {
  await prisma.courseModule.delete({ where: { id: moduleId } });
};

export const createCheckpoint = async (moduleId: string, data: { title: string; order?: number; passingScore?: number }) => {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.create({
      data: { moduleId, title: data.title, slug: `checkpoint-${Date.now()}`, type: 'QUIZ', order: data.order ?? 0 },
    });
    const quiz = await tx.academyQuiz.create({
      data: { lessonId: lesson.id, title: data.title, passingScore: data.passingScore ?? 70, isPublished: false },
    });
    return { ...lesson, quiz };
  });
};
