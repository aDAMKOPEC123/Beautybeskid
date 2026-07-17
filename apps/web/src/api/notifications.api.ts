import { api } from '../lib/axios';

export type Notification = {
  id: string;
  userId: string;
  type: 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED'
      | 'LOYALTY_POINTS' | 'LOYALTY_TIER_UP' | 'SERIES_REMINDER' | 'GENERIC'
      | 'CHAT_MESSAGE' | 'ACHIEVEMENT_UNLOCKED' | 'JOURNAL_COMMENT' | 'RECOMMENDATION_ADDED'
      | 'NEW_APPOINTMENT' | 'NEW_CONSULTATION' | 'NEW_REVIEW' | 'BROADCAST'
      | 'BLOG_COMMENT_REPLY' | 'SKIN_WEATHER' | 'NEW_REGISTRATION';
  title: string;
  body: string;
  url?: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
};

export type NotificationUnreadMap = Record<string, number>;

export const notificationsApi = {
  getAll: async (page = 1, limit = 20): Promise<NotificationsResponse> => {
    const res = await api.get('/notifications', { params: { page, limit } });
    return res.data.data;
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.count;
  },
  getUnreadMap: async (): Promise<NotificationUnreadMap> => {
    const res = await api.get('/notifications/unread-map');
    return res.data.data.counts;
  },
  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
  broadcast: async (data: { title: string; body: string; url?: string }) =>
    api.post('/notifications/broadcast', data).then(r => r.data as { data: { sent: number; push?: { attempted: number; delivered: number; failed: number } } }),
};
