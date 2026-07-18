import webpush from 'web-push';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_EMAIL) {
    webpush.setVapidDetails(env.VAPID_EMAIL, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
}

export const saveSubscription = async (
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) => {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
};

export const deleteSubscription = async (userId: string, endpoint: string) => {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
};

const sendPushToSubscriptions = async (
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: { title: string; body: string; url?: string },
) => {
  ensureVapid();
  if (!vapidConfigured || subscriptions.length === 0) {
    return { attempted: 0, delivered: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        )
        .catch(async (e: any) => {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          } else {
            console.error(`Push notification failed for endpoint ${s.endpoint}:`, e?.message ?? e);
          }
          throw e;
        }),
      ),
  );
  return {
    attempted: subscriptions.length,
    delivered: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
};

export const sendPushToUser = async (
  userId: string,
  payload: { title: string; body: string; url?: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { pushSubscriptions: true },
  });

  if (!user) return { attempted: 0, delivered: 0, failed: 0 };
  return sendPushToSubscriptions(user.pushSubscriptions, payload);
};

export const sendPushToAdmins = async (payload: { title: string; body: string; url?: string }) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    include: { pushSubscriptions: true },
  });

  return sendPushToSubscriptions(
    admins.flatMap((admin) => admin.pushSubscriptions),
    payload,
  );
};

export const sendPushToUsers = async (
  userIds: string[],
  payload: { title: string; body: string; url?: string },
) => {
  if (userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  return sendPushToSubscriptions(subscriptions, payload);
};

export const sendPushToAllUsers = async (payload: { title: string; body: string; url?: string }) => {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: 'USER', accountStatus: 'ACTIVE' } },
  });
  return sendPushToSubscriptions(subscriptions, payload);
};
