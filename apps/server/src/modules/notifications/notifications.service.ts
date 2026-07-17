import { prisma } from '../../config/prisma';
import { NotificationAudience, NotificationType } from '@prisma/client';
import type { Server } from 'socket.io';
import { AppError } from '../../middleware/error.middleware';

export const getNotifications = async (userId: string, page = 1, limit = 20, audience: NotificationAudience = 'USER') => {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, audience },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId, audience } }),
    prisma.notification.count({ where: { userId, audience, readAt: null } }),
  ]);

  return {
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  };
};

export const markRead = async (userId: string, notificationId: string, audience: NotificationAudience = 'USER') => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, audience },
  });

  if (!notification) {
    throw new AppError('Powiadomienie nie zostało znalezione', 404);
  }

  return await prisma.notification.update({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
};

export const markAllRead = async (userId: string, audience: NotificationAudience = 'USER') => {
  await prisma.notification.updateMany({
    where: { userId, audience, readAt: null },
    data: { readAt: new Date() },
  });
};

export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  audience?: NotificationAudience;
}) => {
  return await prisma.notification.create({ data: { ...data, audience: data.audience ?? 'USER' } });
};

export const getUnreadCount = async (userId: string, audience: NotificationAudience = 'USER') => {
  return await prisma.notification.count({ where: { userId, audience, readAt: null } });
};

const normalizeNotificationPath = (url: string | null): string | null => {
  if (!url) return null;

  try {
    return new URL(url, 'https://beautybeskid.local').pathname;
  } catch {
    return url.split(/[?#]/)[0] || null;
  }
};

export const getUnreadRouteCounts = async (userId: string, audience: NotificationAudience = 'USER') => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      audience,
      readAt: null,
      url: { not: null },
    },
    select: { url: true },
  });

  return notifications.reduce<Record<string, number>>((acc, notification) => {
    const normalizedPath = normalizeNotificationPath(notification.url);
    if (!normalizedPath) return acc;

    acc[normalizedPath] = (acc[normalizedPath] ?? 0) + 1;
    return acc;
  }, {});
};

export async function createAndEmitNotification(
  io: Server,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    url?: string;
    audience?: NotificationAudience;
    emitToAdminGlobal?: boolean;
  },
) {
  const notification = await createNotification(data);
  const unreadCount = await getUnreadCount(data.userId, data.audience);
  io.to(`user:${data.userId}`).emit('notification:new', { unreadCount });
  if (data.emitToAdminGlobal) {
    io.to('admin:global').emit('notification:new', {});
  }
  return notification;
}
