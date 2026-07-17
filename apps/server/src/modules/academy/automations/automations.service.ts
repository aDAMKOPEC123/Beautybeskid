import { prisma } from '../../../config/prisma';
import { env } from '../../../config/env';
import { sendEmail } from '../../../utils/email';

const base = () => env.ACADEMY_URL ?? 'http://localhost:5174';
const key = (userId: string, courseId: string) => `${userId}:${courseId}`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);

const deliver = async (input: { userId: string; courseId?: string; orderId?: string; type: string; email: string; subject: string; html: string }) => {
  const exists = await prisma.academyAutomationLog.findFirst({ where: { userId: input.userId, courseId: input.courseId ?? null, orderId: input.orderId ?? null, type: input.type } });
  if (exists) return false;
  try {
    await sendEmail(input.email, input.subject, input.html);
    await prisma.academyAutomationLog.create({ data: { userId: input.userId, courseId: input.courseId, orderId: input.orderId, type: input.type } });
    return true;
  } catch (error) {
    await prisma.academyOperationalEvent.create({ data: {
      severity: 'ERROR',
      source: 'ACADEMY_AUTOMATION',
      message: error instanceof Error ? error.message.slice(0, 500) : 'Błąd automatyzacji',
      details: { type: input.type, userId: input.userId },
    } });
    return false;
  }
};

export const runAcademyAutomations = async () => {
  const now = new Date();
  const enrollments = await prisma.academyEnrollment.findMany({ include: { user: true, course: true }, take: 5000 });
  if (!enrollments.length) return;
  const userIds = [...new Set(enrollments.map((entry) => entry.userId))];
  const courseIds = [...new Set(enrollments.map((entry) => entry.courseId))];
  const enrollmentKeys = new Set(enrollments.map((entry) => key(entry.userId, entry.courseId)));
  const [progressRows, activityRows] = await Promise.all([
    prisma.userCourseProgress.findMany({ where: { userId: { in: userIds }, courseId: { in: courseIds } } }),
    prisma.userLessonProgress.findMany({
      where: { userId: { in: userIds }, lesson: { module: { courseId: { in: courseIds } } } },
      select: { userId: true, updatedAt: true, lesson: { select: { module: { select: { courseId: true } } } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  const progress = new Map(progressRows.filter((row) => enrollmentKeys.has(key(row.userId, row.courseId))).map((row) => [key(row.userId, row.courseId), row]));
  const latestActivity = new Map<string, Date>();
  for (const row of activityRows) {
    const activityKey = key(row.userId, row.lesson.module.courseId);
    if (enrollmentKeys.has(activityKey) && !latestActivity.has(activityKey)) latestActivity.set(activityKey, row.updatedAt);
  }

  for (const enrollment of enrollments) {
    const courseProgress = progress.get(key(enrollment.userId, enrollment.courseId));
    const title = escapeHtml(enrollment.course.title);
    const url = `${base()}/kurs/${encodeURIComponent(enrollment.course.slug)}`;
    const age = now.getTime() - enrollment.purchasedAt.getTime();
    const lastActivity = latestActivity.get(key(enrollment.userId, enrollment.courseId)) ?? courseProgress?.updatedAt ?? courseProgress?.startedAt;
    if (age > 5 * 60_000) await deliver({ userId: enrollment.userId, courseId: enrollment.courseId, type: 'START_GUIDE', email: enrollment.user.email, subject: `Jak zacząć: ${enrollment.course.title}`, html: `<h1>Twój kurs jest gotowy</h1><p>Zacznij od pierwszej lekcji i ucz się we własnym tempie.</p><p><a href="${url}">Rozpocznij kurs „${title}”</a></p>` });
    if (!courseProgress?.startedAt && age > 3 * 86_400_000) await deliver({ userId: enrollment.userId, courseId: enrollment.courseId, type: 'NOT_STARTED', email: enrollment.user.email, subject: 'Twój kurs czeka na pierwszy krok', html: `<p>Materiały „${title}” są już na Twoim koncie.</p><p><a href="${url}">Zacznij teraz</a></p>` });
    if (courseProgress?.startedAt && !courseProgress.completedAt && lastActivity && now.getTime() - lastActivity.getTime() > 7 * 86_400_000) await deliver({ userId: enrollment.userId, courseId: enrollment.courseId, type: 'INACTIVE_7D', email: enrollment.user.email, subject: 'Wróć do rozpoczętego kursu', html: `<p>Twój postęp został zapisany. Możesz kontynuować dokładnie od miejsca, w którym skończyłaś/eś.</p><p><a href="${url}">Kontynuuj naukę</a></p>` });
    if (courseProgress?.completedAt) await deliver({ userId: enrollment.userId, courseId: enrollment.courseId, type: 'COMPLETED', email: enrollment.user.email, subject: `Gratulacje — ${enrollment.course.title} ukończony`, html: `<h1>Gratulacje!</h1><p>Pobierz certyfikat, podziel się opinią i zobacz rekomendowany kolejny kurs.</p><p><a href="${url}">Oceń kurs „${title}”</a></p>` });
    if (enrollment.accessExpiresAt && enrollment.accessExpiresAt > now && enrollment.accessExpiresAt.getTime() - now.getTime() < 7 * 86_400_000) await deliver({ userId: enrollment.userId, courseId: enrollment.courseId, type: 'ACCESS_EXPIRING', email: enrollment.user.email, subject: 'Dostęp do kursu wkrótce wygaśnie', html: `<p>Twój dostęp do „${title}” wygaśnie ${enrollment.accessExpiresAt.toLocaleDateString('pl-PL')}.</p><p><a href="${url}">Dokończ kurs</a></p>` });
  }
};

export const initializeAcademyAutomationScheduler = () => {
  const run = () => runAcademyAutomations().catch((error) => prisma.academyOperationalEvent.create({ data: { severity: 'ERROR', source: 'ACADEMY_AUTOMATION_SCHEDULER', message: error instanceof Error ? error.message.slice(0, 500) : 'Błąd harmonogramu automatyzacji' } }).catch(() => undefined));
  void run();
  return setInterval(run, 6 * 60 * 60 * 1000);
};
