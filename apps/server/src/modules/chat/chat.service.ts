// filepath: apps/server/src/modules/chat/chat.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import path from 'path';
import { unlink } from 'fs/promises';

export const getAllRooms = async () => {
  return await prisma.chatRoom.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, avatarPath: true } }
    }
  });
};

export const getRoomMessages = async (roomId: string) => {
  return await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarPath: true } }
    }
  });
};

export const getMyRoom = async (userId: string) => {
  let room = await prisma.chatRoom.findUnique({
    where: { userId }
  });

  if (!room) {
    room = await prisma.chatRoom.create({
      data: { userId }
    });
  }

  const messages = await getRoomMessages(room.id);
  return { ...room, messages };
};

export const saveMessage = async (
  roomId: string,
  senderId: string,
  receiverId: string,
  content: string,
  attachmentUrl?: string,
  attachmentType?: string
) => {
  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId,
      receiverId,
      content,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
    },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarPath: true } }
    }
  });

  const sender = await prisma.user.findUnique({ where: { id: senderId } });
  if (sender?.role === 'ADMIN' || sender?.role === 'EMPLOYEE') {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date(), userUnread: { increment: 1 } }
    });
  } else {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date(), adminUnread: { increment: 1 } }
    });
  }

  return message;
};

export const markMessagesAsRead = async (roomId: string, readerUserId: string) => {
  const readAt = new Date();

  await prisma.chatMessage.updateMany({
    where: {
      roomId,
      receiverId: readerUserId,
      readAt: null,
    },
    data: { readAt },
  });

  // Reset unread counter for this reader
  const reader = await prisma.user.findUnique({ where: { id: readerUserId } });
  if (reader?.role === 'ADMIN' || reader?.role === 'EMPLOYEE') {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { adminUnread: 0 },
    });
  } else {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { userUnread: 0 },
    });
  }

  return readAt;
};

export const getStaffUnreadTotal = async (): Promise<number> => {
  const result = await prisma.chatRoom.aggregate({
    _sum: { adminUnread: true }
  });
  return result._sum.adminUnread || 0;
};

export const deleteRoom = async (roomId: string): Promise<void> => {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError('Pokój nie istnieje', 404);

  // Find messages that have physical file attachments
  const messagesWithFiles = await prisma.chatMessage.findMany({
    where: { roomId, attachmentUrl: { not: null } },
    select: { attachmentUrl: true },
  });

  // Delete records in a transaction FIRST.
  // IMPORTANT: messages MUST be deleted before the room.
  // ChatMessage has no onDelete: Cascade — PostgreSQL will reject deleting
  // ChatRoom while ChatMessage rows still hold a foreign key reference to it.
  // Inside $transaction, use the transaction client `tx`, NOT the outer `prisma`.
  // If this fails, no files are touched — DB remains consistent.
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany({ where: { roomId } });
    await tx.chatRoom.delete({ where: { id: roomId } });
  });

  // Delete files from disk AFTER the transaction succeeds.
  // path.basename() is REQUIRED here — it strips directory components from the
  // stored URL (e.g. '/uploads/chat/file.jpg' -> 'file.jpg'), preventing path
  // traversal if a DB value is ever malformed.
  // CHAT_UPLOADS_DIR equivalent: process.cwd()/uploads/chat (matches chatUpload.ts)
  // A failure here leaves orphaned files (storage leak) but DB is consistent.
  for (const msg of messagesWithFiles) {
    if (!msg.attachmentUrl) continue;
    const filename = path.basename(msg.attachmentUrl);
    const filePath = path.join(process.cwd(), 'uploads', 'chat', filename);
    try {
      await unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`Failed to delete chat attachment: ${filePath}`, err);
      }
      // ENOENT = file already gone — not an error, continue
    }
  }
};
