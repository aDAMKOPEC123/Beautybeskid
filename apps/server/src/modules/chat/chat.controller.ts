// filepath: apps/server/src/modules/chat/chat.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service';
import { getIO } from '../../socket';
import { AppError } from '../../middleware/error.middleware';
import { sendPushToUser, sendPushToAdmins } from '../../modules/push/push.service';

import { prisma } from '../../config/prisma';
import { createAndEmitNotification } from '../notifications/notifications.service';

export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await chatService.getAllRooms();
    res.status(200).json({ status: 'success', data: { rooms } });
  } catch (error) {
    next(error);
  }
};

export const getRoomMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await chatService.getRoomMessages(req.params.id);
    res.status(200).json({ status: 'success', data: { messages } });
  } catch (error) {
    next(error);
  }
};

export const getMyRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await chatService.getMyRoom(req.user!.id);
    res.status(200).json({ status: 'success', data: { room } });
  } catch (error) {
    next(error);
  }
};

export const sendMessageREST = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomId, content } = req.body;
    const senderId = req.user!.id;
    const senderRole = req.user!.role;

    if (!roomId) throw new AppError('roomId jest wymagany', 400);
    if (!content?.trim() && !req.file) throw new AppError('Treść lub załącznik jest wymagany', 400);

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError('Pokój nie istnieje', 404);

    if (senderRole === 'USER' && room.userId !== senderId) {
      throw new AppError('Brak dostępu do tego pokoju', 403);
    }

    // Determine receiverId server-side
    let receiverId: string;
    if (senderRole === 'USER') {
      if (room.adminId) {
        receiverId = room.adminId;
      } else {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) throw new AppError('Brak dostępnego administratora', 503);
        receiverId = admin.id;
      }
    } else {
      receiverId = room.userId;
    }

    // Handle file attachment
    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;
    if (req.file) {
      attachmentUrl = `/uploads/chat/${req.file.filename}`;
      attachmentType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    }

    const message = await chatService.saveMessage(
      roomId,
      senderId,
      receiverId,
      content?.trim() || '',
      attachmentUrl,
      attachmentType
    );

    // Broadcast via socket
    try {
      const io = getIO();
      io.to(`room:${roomId}`).emit('chat:message', message as any);

      if (senderRole === 'USER') {
        const total = await chatService.getStaffUnreadTotal();
        io.to('admin:global').emit('admin:unread_count', total);
        io.to('employee:global').emit('staff:unread_count', total);
      }
    } catch {
      // Socket not initialized yet — REST response still succeeds
    }


    // Push notifications — sent regardless of socket availability
    try {
      const io = getIO();
      if (senderRole === 'USER') {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        await Promise.all(admins.map((admin) => createAndEmitNotification(io, {
          userId: admin.id,
          type: 'CHAT_MESSAGE',
          title: 'Nowa wiadomość od klienta',
          body: `${message.sender?.name ?? 'Klient'} napisał/a w chacie`,
          url: '/admin/chat',
          audience: 'ADMIN',
        })));
        await sendPushToAdmins({
          title: 'Nowa wiadomość od klienta',
          body: (message.sender && message.sender.name ? message.sender.name : 'Klient') + ' napisał/a w chacie',
          url: '/admin/chat',
        });
      } else {
        await createAndEmitNotification(io, {
          userId: room.userId,
          type: 'CHAT_MESSAGE',
          title: 'Nowa wiadomość',
          body: 'Otrzymałeś/aś nową wiadomość w chacie',
          url: '/user/chat',
        });
        await sendPushToUser(room.userId, {
          title: 'Nowa wiadomość',
          body: 'Otrzymałeś/aś nową wiadomość w chacie',
          url: '/user/chat',
        });
      }
    } catch (err) {
      console.error('Push notification failed (REST chat):', err);
    }

    res.status(201).json({ status: 'success', data: { message } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: roomId } = req.params;
    const readerUserId = req.user!.id;

    const readAt = await chatService.markMessagesAsRead(roomId, readerUserId);

    try {
      const io = getIO();
      io.to(`room:${roomId}`).emit('chat:read_receipt', { roomId, readAt: readAt.toISOString() });

      if (req.user!.role !== 'USER') {
        const total = await chatService.getStaffUnreadTotal();
        io.to('admin:global').emit('admin:unread_count', total);
        io.to('employee:global').emit('staff:unread_count', total);
      }
    } catch {
      // Socket not initialized
    }

    res.status(200).json({ status: 'success', data: { readAt } });
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.id;
    await chatService.deleteRoom(roomId);

    // Emit room:deleted to the Socket.IO room `room:<roomId>`.
    // Users join this room via `socket.emit('chat:join_room', roomId)` in useChat.ts.
    // This notifies any user who currently has their chat page open.
    try {
      const io = getIO();
      io.to(`room:${roomId}`).emit('room:deleted', { roomId });
    } catch {
      // Socket not initialized — safe to ignore
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
