// filepath: apps/web/src/hooks/useChat.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useChatStore } from '../store/chat.store';
import { chatApi } from '../api/chat.api';

export const useChat = (roomId?: string, onRoomDeleted?: () => void) => {
  const { socket, isConnected } = useSocket();
  const {
    addMessage,
    setTyping,
    incrementUnread,
    setStaffUnreadTotal,
    updateMessagesReadAt,
    messages,
  } = useChatStore();

  useEffect(() => {
    if (!isConnected || !socket) return;

    if (roomId) {
      socket.emit('chat:join_room', roomId);
    }

    const onMessage = (msg: any) => {
      addMessage(msg);
      if (!roomId) {
        incrementUnread();
      } else {
        socket.emit('chat:mark_read', roomId);
      }
    };

    const onTyping = ({ isTyping }: { isTyping: boolean }) => {
      setTyping(isTyping);
    };

    const onReadReceipt = ({ readAt }: { roomId: string; readAt: string }) => {
      updateMessagesReadAt(readAt);
    };

    const onAdminUnread = (count: number) => {
      setStaffUnreadTotal(count);
    };

    const onStaffUnread = (count: number) => {
      setStaffUnreadTotal(count);
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read_receipt', onReadReceipt);
    socket.on('admin:unread_count', onAdminUnread);
    socket.on('staff:unread_count', onStaffUnread);

    const onRoomDeletedEvent = ({ roomId: deletedRoomId }: { roomId: string }) => {
      if (deletedRoomId === roomId && onRoomDeleted) {
        onRoomDeleted();
      }
    };
    socket.on('room:deleted', onRoomDeletedEvent);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read_receipt', onReadReceipt);
      socket.off('admin:unread_count', onAdminUnread);
      socket.off('staff:unread_count', onStaffUnread);
      socket.off('room:deleted', onRoomDeletedEvent);
    };
  }, [isConnected, socket, roomId, addMessage, incrementUnread, setTyping, setStaffUnreadTotal, updateMessagesReadAt, onRoomDeleted]);

  const sendMessage = async (content: string, rId: string, file?: File) => {
    const fd = new FormData();
    fd.append('roomId', rId);
    if (content.trim()) fd.append('content', content.trim());
    if (file) fd.append('file', file);

    const msg = await chatApi.sendMessage(fd);
    addMessage(msg);
    return msg;
  };

  const markAsRead = (rId: string) => {
    if (socket && isConnected) {
      socket.emit('chat:mark_read', rId);
    }
  };

  const notifyTyping = (rId: string, isTyping: boolean) => {
    if (socket && isConnected) {
      socket.emit('chat:typing', { roomId: rId, isTyping });
    }
  };

  return { sendMessage, markAsRead, notifyTyping, messages };
};
