import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const messageInclude = { author: { select: { id: true, name: true, role: true } } } as const;

export const getMyThread = async (userId: string) => {
  const thread = await prisma.academySupportThread.upsert({
    where: { userId }, create: { userId }, update: {},
    include: { messages: { include: messageInclude, orderBy: { createdAt: 'asc' } } },
  });
  await prisma.academySupportMessage.updateMany({ where: { threadId: thread.id, authorId: { not: userId }, readAt: null }, data: { readAt: new Date() } });
  return thread;
};

export const sendUserMessage = async (userId: string, content: string) => {
  const thread = await prisma.academySupportThread.upsert({ where: { userId }, create: { userId }, update: {} });
  const message = await prisma.academySupportMessage.create({ data: { threadId: thread.id, authorId: userId, content }, include: messageInclude });
  await prisma.academySupportThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date(), adminUnread: { increment: 1 } } });
  return message;
};

export const listAdminThreads = async () => prisma.academySupportThread.findMany({
  include: { user: { select: { id: true, name: true, email: true } }, admin: { select: { id: true, name: true } }, messages: { include: messageInclude, orderBy: { createdAt: 'asc' } } },
  orderBy: { lastMessageAt: 'desc' },
});

export const sendAdminMessage = async (adminId: string, threadId: string, content: string) => {
  const thread = await prisma.academySupportThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new AppError('Nie znaleziono rozmowy Akademii', 404);
  const message = await prisma.academySupportMessage.create({ data: { threadId, authorId: adminId, content }, include: messageInclude });
  await prisma.academySupportThread.update({ where: { id: threadId }, data: { adminId, lastMessageAt: new Date(), userUnread: { increment: 1 }, adminUnread: 0 } });
  return message;
};
