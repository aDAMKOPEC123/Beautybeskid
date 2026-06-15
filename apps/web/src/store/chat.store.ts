// filepath: apps/web/src/store/chat.store.ts
import { create } from 'zustand';
import { ChatMessagePayload } from '@cosmo/shared';

interface ChatState {
  messages: ChatMessagePayload[];
  isTyping: boolean;
  unreadCount: number;
  staffUnreadTotal: number;
  setMessages: (messages: ChatMessagePayload[]) => void;
  addMessage: (message: ChatMessagePayload) => void;
  setTyping: (isTyping: boolean) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  setStaffUnreadTotal: (count: number) => void;
  updateMessagesReadAt: (readAt: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  unreadCount: 0,
  staffUnreadTotal: 0,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) {
        return { messages: state.messages.map((m) => m.id === message.id ? message : m) };
      }
      return { messages: [...state.messages, message] };
    }),
  setTyping: (isTyping) => set({ isTyping }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  setStaffUnreadTotal: (count) => set({ staffUnreadTotal: count }),
  updateMessagesReadAt: (readAt) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.readAt === null || m.readAt === undefined ? { ...m, readAt } : m
      ),
    })),
}));
