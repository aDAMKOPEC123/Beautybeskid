import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminNotification {
  id: string;
  type: 'created' | 'updated' | 'deleted';
  message: string;
  appointmentId?: string;
  clientName?: string;
  serviceName?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: AdminNotification[];
  unreadCount: number;
  unreadAppointmentIds: Set<string>;
  addNotification: (n: Omit<AdminNotification, 'id' | 'read'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

function buildUnreadSet(notifications: AdminNotification[]): Set<string> {
  return new Set(
    notifications
      .filter((x) => !x.read && x.appointmentId)
      .map((x) => x.appointmentId!),
  );
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      unreadAppointmentIds: new Set<string>(),

      addNotification: (n) =>
        set((state) => {
          const notification: AdminNotification = {
            ...n,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            read: false,
          };
          const updated = [notification, ...state.notifications].slice(0, 50);
          return {
            notifications: updated,
            unreadCount: updated.filter((x) => !x.read).length,
            unreadAppointmentIds: buildUnreadSet(updated),
          };
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
          unreadAppointmentIds: new Set<string>(),
        })),

      clearAll: () =>
        set({ notifications: [], unreadCount: 0, unreadAppointmentIds: new Set<string>() }),
    }),
    {
      name: 'cosmo-admin-notifications',
      // Set nie jest serializowalne jako JSON — pomijamy je w persist,
      // odtwarzamy z notifications przy każdym załadowaniu
      partialize: (state) => ({ notifications: state.notifications }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const unread = state.notifications.filter((x) => !x.read);
          state.unreadCount = unread.length;
          state.unreadAppointmentIds = buildUnreadSet(state.notifications);
        }
      },
    },
  ),
);
