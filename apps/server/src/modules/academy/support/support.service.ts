import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { sendEmail } from '../../../utils/email';

const messageInclude = { author: { select: { id: true, name: true, role: true } } } as const;

export const getMyThread = async (userId: string) => {
  const thread = await prisma.academySupportThread.upsert({
    where: { userId }, create: { userId }, update: {},
    include: { messages: { include: messageInclude, orderBy: { createdAt: 'asc' } } },
  });
  await prisma.academySupportMessage.updateMany({ where: { threadId: thread.id, authorId: { not: userId }, readAt: null }, data: { readAt: new Date() } });
  if (thread.userUnread > 0) {
    await prisma.academySupportThread.update({ where: { id: thread.id }, data: { userUnread: 0 } });
  }
  return { ...thread, userUnread: 0 };
};

type UserMessageOptions = {
  category?: 'COURSE_CONTENT' | 'PROCEDURE' | 'CONTRAINDICATIONS' | 'TECHNICAL' | 'CERTIFICATE' | 'PAYMENT' | 'INVOICE' | 'REFUND' | 'COMPLAINT' | 'OTHER';
  courseId?: string;
  lessonId?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  sensitiveDataConsent?: boolean;
};

export const sendUserMessage = async (userId: string, content: string, options: UserMessageOptions = {}) => {
  const context = {
    ...(options.category ? { category: options.category } : {}),
    ...(options.courseId ? { courseId: options.courseId } : {}),
    ...(options.lessonId ? { lessonId: options.lessonId } : {}),
  };
  const thread = await prisma.academySupportThread.upsert({
    where: { userId },
    create: { userId, ...context },
    update: { ...context, status: 'OPEN', resolvedAt: null },
  });
  const message = await prisma.academySupportMessage.create({
    data: {
      threadId: thread.id,
      authorId: userId,
      content,
      attachmentUrl: options.attachmentUrl,
      attachmentType: options.attachmentType,
      sensitiveDataConsent: options.sensitiveDataConsent ?? false,
    },
    include: messageInclude,
  });
  await prisma.academySupportThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date(), adminUnread: { increment: 1 }, rating: null, ratingComment: null } });
  return message;
};

export const listAdminThreads = async () => prisma.academySupportThread.findMany({
  include: { user: { select: { id: true, name: true, email: true } }, admin: { select: { id: true, name: true } }, messages: { include: messageInclude, orderBy: { createdAt: 'asc' }, take: 100 } },
  orderBy: { lastMessageAt: 'desc' },
  take: 100,
});

export const markAdminThreadRead = async (threadId: string) => {
  await prisma.$transaction([
    prisma.academySupportMessage.updateMany({ where: { threadId, author: { role: { not: 'ADMIN' } }, readAt: null }, data: { readAt: new Date() } }),
    prisma.academySupportThread.update({ where: { id: threadId }, data: { adminUnread: 0 } }),
  ]);
};

export const sendAdminMessage = async (adminId: string, threadId: string, content: string) => {
  const thread = await prisma.academySupportThread.findUnique({ where: { id: threadId }, include: { user: { select: { email: true, name: true } } } });
  if (!thread) throw new AppError('Nie znaleziono rozmowy Akademii', 404);
  const message = await prisma.academySupportMessage.create({ data: { threadId, authorId: adminId, content }, include: messageInclude });
  await prisma.academySupportThread.update({ where: { id: threadId }, data: { adminId, lastMessageAt: new Date(), userUnread: { increment: 1 }, adminUnread: 0, status: 'WAITING_FOR_USER' } });
  const escaped = content.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
  void sendEmail(thread.user.email, 'Nowa odpowiedź w Akademii BeskidStudio', `<p>Dzień dobry ${thread.user.name || ''},</p><p>Kosmetolog odpowiedział na Twoje pytanie:</p><blockquote>${escaped.replace(/\n/g, '<br>')}</blockquote><p>Zaloguj się do Akademii, aby kontynuować rozmowę.</p>`).catch((error) => console.error('[academy-support] notification email failed', error));
  return message;
};

export const updateThreadStatus = async (threadId: string, adminId: string, status: 'OPEN' | 'WAITING_FOR_USER' | 'RESOLVED' | 'ARCHIVED') => {
  const existing = await prisma.academySupportThread.findUnique({ where: { id: threadId }, select: { id: true } });
  if (!existing) throw new AppError('Nie znaleziono rozmowy Akademii', 404);
  return prisma.academySupportThread.update({
    where: { id: threadId },
    data: { status, adminId, resolvedAt: status === 'RESOLVED' ? new Date() : null },
  });
};

export const rateThread = async (threadId: string, userId: string, rating: number, ratingComment?: string) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError('Ocena musi mieścić się w skali 1–5', 400);
  const thread = await prisma.academySupportThread.findFirst({ where: { id: threadId, userId, status: 'RESOLVED' } });
  if (!thread) throw new AppError('Możesz ocenić tylko swoją zakończoną konsultację', 403);
  return prisma.academySupportThread.update({ where: { id: threadId }, data: { rating, ratingComment: ratingComment?.slice(0, 500) || null } });
};
