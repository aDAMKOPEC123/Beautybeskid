import { api } from '../lib/axios';

export const homecareApi = {
  get: (appointmentId: string) =>
    api.get(`/homecare/${appointmentId}`).then((r) => r.data.data.routine),
  update: (appointmentId: string, data: { first48h?: string; followingDays?: string; products?: string }) =>
    api.put(`/homecare/${appointmentId}`, data).then((r) => r.data.data.routine),
  send: (appointmentId: string) =>
    api.post(`/homecare/${appointmentId}/send`).then((r) => r.data.data.routine),
  createDraft: (appointmentId: string) =>
    api.post(`/homecare/${appointmentId}`).then((r) => r.data.data.routine),
  getMy: () => api.get('/homecare/my').then((r) => r.data.data.routines),
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/homecare/unread-count');
    return res.data.data.count;
  },
  markViewed: () => api.post('/homecare/mark-viewed'),
  deleteMyRoutine: (id: string) => api.delete(`/homecare/my/${id}`),
};
