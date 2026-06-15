import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReviewPromptItem {
  appointmentId: string;
  serviceName: string;
  employeeName?: string;
  date: string;
}

interface ReviewPromptStore {
  queue: ReviewPromptItem[];
  dismissed: string[];
  addToQueue: (item: ReviewPromptItem) => void;
  dismiss: (appointmentId: string) => void;
  removeCompleted: (appointmentId: string) => void;
}

export const useReviewPromptStore = create<ReviewPromptStore>()(
  persist(
    (set) => ({
      queue: [],
      dismissed: [],

      addToQueue: (item) =>
        set((state) => {
          if (
            state.queue.some((q) => q.appointmentId === item.appointmentId) ||
            state.dismissed.includes(item.appointmentId)
          ) {
            return state;
          }
          return { queue: [...state.queue, item] };
        }),

      dismiss: (appointmentId) =>
        set((state) => ({
          queue: state.queue.filter((q) => q.appointmentId !== appointmentId),
          dismissed: [...state.dismissed, appointmentId],
        })),

      removeCompleted: (appointmentId) =>
        set((state) => ({
          queue: state.queue.filter((q) => q.appointmentId !== appointmentId),
        })),
    }),
    {
      name: 'cosmo-review-prompt',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
);
