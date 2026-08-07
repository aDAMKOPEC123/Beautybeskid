import webpush from 'web-push';
import { prisma } from '../../../config/prisma';
import { env } from '../../../config/env';

/**
 * Push dla kursantek. Świadomie osobno od `modules/push` salonu: subskrypcja
 * wisi na AcademyUser, a nie na User, więc współdzielenie tabeli wysyłałoby
 * powiadomienia na niewłaściwe konta. Klucze VAPID są wspólne — to ta sama
 * domena nadawcy.
 */

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_EMAIL) {
    webpush.setVapidDetails(env.VAPID_EMAIL, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
}

export const isPushConfigured = () =>
  Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_EMAIL);

export const saveSubscription = async (
  academyUserId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) => {
  await prisma.academyPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { academyUserId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { academyUserId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
};

export const deleteSubscription = async (academyUserId: string, endpoint: string) => {
  await prisma.academyPushSubscription.deleteMany({ where: { academyUserId, endpoint } });
};

export type AcademyPushPayload = { title: string; body: string; url?: string };

/**
 * Wysyłka jest celowo „best effort": powiadomienie nigdy nie może wywrócić
 * operacji, która je wywołała (wydanie certyfikatu, odpowiedź na wiadomość).
 * Subskrypcje odrzucone przez przeglądarkę (404/410) kasujemy od razu, bo
 * inaczej narastają w bazie i psują statystyki dostarczeń.
 */
export const sendPushToAcademyUser = async (academyUserId: string, payload: AcademyPushPayload) => {
  ensureVapid();
  if (!vapidConfigured) return { attempted: 0, delivered: 0, failed: 0 };

  const subscriptions = await prisma.academyPushSubscription.findMany({ where: { academyUserId } });
  if (subscriptions.length === 0) return { attempted: 0, delivered: 0, failed: 0 };

  const stale: string[] = [];
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
      ).catch((error: any) => {
        if (error?.statusCode === 404 || error?.statusCode === 410) stale.push(subscription.endpoint);
        throw error;
      }),
    ),
  );

  if (stale.length > 0) {
    await prisma.academyPushSubscription.deleteMany({ where: { endpoint: { in: stale } } }).catch(() => undefined);
  }

  const delivered = results.filter((result) => result.status === 'fulfilled').length;
  return { attempted: subscriptions.length, delivered, failed: subscriptions.length - delivered };
};

/** Nie przerywa wywołującej operacji, cokolwiek się stanie z wysyłką. */
export const notifyAcademyUser = (academyUserId: string, payload: AcademyPushPayload) =>
  sendPushToAcademyUser(academyUserId, payload).catch(() => undefined);
