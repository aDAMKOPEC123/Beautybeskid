// filepath: apps/web/src/api/chat.api.ts
import { api } from '../lib/axios';

export const chatApi = {
  getMyRoom: async () => {
    const res = await api.get('/chat/my-room');
    return res.data.data.room;
  },
  getRooms: async () => {
    const res = await api.get('/chat/rooms');
    return res.data.data.rooms;
  },
  getRoomMessages: async (id: string) => {
    const res = await api.get(`/chat/rooms/${id}/messages`);
    return res.data.data.messages;
  },
  sendMessage: async (formData: FormData) => {
    const res = await api.post('/chat/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.message;
  },
  markRoomAsRead: async (roomId: string) => {
    const res = await api.post(`/chat/rooms/${roomId}/read`);
    return res.data.data;
  },
  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/chat/rooms/${roomId}`);
    // No return value — server responds with 204 No Content
  },
};
