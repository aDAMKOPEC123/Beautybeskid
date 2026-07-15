// filepath: apps/web/src/pages/user/Chat.tsx
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chat.store';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Lock, ImageOff, ChevronDown, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Dzisiaj';
  if (isYesterday(date)) return 'Wczoraj';
  return format(date, 'd MMMM yyyy', { locale: pl });
}

export const UserChat = () => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, setUnreadCount, isTyping } = useChatStore();
  const queryClient = useQueryClient();
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [privacyDismissed, setPrivacyDismissed] = useState(() =>
    localStorage.getItem('cosmo-chat-privacy-seen') === '1'
  );

  const { data: room, isLoading } = useQuery({
    queryKey: ['chat', 'my-room'],
    queryFn: chatApi.getMyRoom,
  });

  const onRoomDeleted = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    queryClient.invalidateQueries({ queryKey: ['chat', 'my-room'] });
  }, [setMessages, setUnreadCount, queryClient]);

  const { sendMessage, markAsRead, notifyTyping } = useChat(room?.id, onRoomDeleted);

  useEffect(() => {
    if (room?.messages) {
      setMessages(room.messages);
    }
  }, [room]);

  useEffect(() => {
    if (room?.id) {
      markAsRead(room.id);
      setUnreadCount(0);
    }
  }, [room?.id, messages.length]);

  // Smart scroll — only auto-scroll if user is near bottom
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isNearBottom]);

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    setShowScrollBtn(!isNearBottom());
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Dismiss privacy notice
  const dismissPrivacy = useCallback(() => {
    setPrivacyDismissed(true);
    localStorage.setItem('cosmo-chat-privacy-seen', '1');
  }, []);

  // Compute date labels and avatar grouping
  const messagesMeta = useMemo(() => {
    return messages.map((msg, idx) => {
      const msgDate = new Date(msg.createdAt);
      const prevMsg = idx > 0 ? messages[idx - 1] : null;
      const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

      // Date label: show if first message or different day from previous
      let dateLabel: string | null = null;
      if (!prevMsg) {
        dateLabel = formatDateLabel(msgDate);
      } else {
        const prevDate = new Date(prevMsg.createdAt);
        if (msgDate.toDateString() !== prevDate.toDateString()) {
          dateLabel = formatDateLabel(msgDate);
        }
      }

      // Avatar: show only on last message in a consecutive group from same sender
      const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId ||
        (nextMsg && new Date(nextMsg.createdAt).toDateString() !== msgDate.toDateString());

      return { dateLabel, showAvatar: isLastInGroup };
    });
  }, [messages]);

  const firstUnreadIndex = messages.findIndex(
    (m) => m.readAt == null && m.senderId !== user?.id
  );

  const handleSend = useCallback(async (content: string, file?: File) => {
    if (!room?.id) return;

    // Optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
      id: tempId,
      content: content.trim() || null,
      senderId: user?.id ?? '',
      roomId: room.id,
      createdAt: new Date().toISOString(),
      readAt: null,
      attachmentUrl: null,
      attachmentType: null,
      sender: user ? { name: user.name, avatarPath: user.avatarPath ?? null } : undefined,
    };

    useChatStore.getState().addMessage(optimisticMsg as any);
    setIsSending(true);

    try {
      await sendMessage(content, room.id, file);
      // Remove optimistic message — real one added by sendMessage/socket
      useChatStore.setState((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
      }));
    } catch {
      // Remove failed optimistic message
      useChatStore.setState((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
      }));
    } finally {
      setIsSending(false);
    }
  }, [room?.id, user, sendMessage]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'rgba(20,40,28,0.5)' }}>
        <Loader2 size={24} className="animate-spin mr-2" />
        Ładowanie czatu...
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full max-w-3xl mx-auto overflow-hidden"
      style={{
        height: 'calc(100dvh - var(--header-height, 64px) - var(--nav-height, 64px) - 32px)',
        minHeight: 0,
        borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.07)',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <h1 data-tour="chat-window" className="w-fit font-heading font-bold text-xl" style={{ color: '#1A3828' }}>
          Czat z konsultantem
        </h1>
        <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
          Odpowiemy najszybciej jak to możliwe
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-1"
        style={{ background: 'rgba(232,243,234,0.5)' }}
      >
        {/* Privacy notice — dismissable, shown once */}
        {!privacyDismissed && (
          <div className="flex flex-col items-center gap-2 py-3 px-2 text-center select-none">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(196,150,90,0.1)' }}
            >
              <ShieldCheck size={20} style={{ color: '#C4965A' }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: '#1A3828' }}>
              Twoja prywatność jest chroniona
            </p>
            <div className="flex flex-col gap-1 text-[11px] max-w-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
              <span className="flex items-center gap-1.5 justify-center">
                <Lock size={10} className="shrink-0" />
                Wiadomości są widoczne wyłącznie dla Ciebie oraz konsultanta.
              </span>
              <span className="flex items-center gap-1.5 justify-center">
                <ImageOff size={10} className="shrink-0" />
                Zdjęcia i pliki nie są udostępniane osobom trzecim.
              </span>
            </div>
            <button
              type="button"
              onClick={dismissPrivacy}
              className="text-[11px] mt-1 px-3 py-1 rounded-full hover:bg-black/5 transition-colors"
              style={{ color: 'rgba(20,40,28,0.4)' }}
            >
              Rozumiem
            </button>
            <div className="w-16 h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />
          </div>
        )}

        {messages.length === 0 && (
          <div
            className="flex-1 flex items-center justify-center text-sm"
            style={{ color: 'rgba(20,40,28,0.4)' }}
          >
            Napisz pierwszą wiadomość, aby rozpocząć rozmowę
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === user?.id}
            showNewMarker={idx === firstUnreadIndex && firstUnreadIndex > 0}
            showAvatar={messagesMeta[idx]?.showAvatar ?? true}
            dateLabel={messagesMeta[idx]?.dateLabel ?? null}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 self-start pl-11">
            <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-muted border">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="relative">
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Przewiń do najnowszej wiadomości"
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white border shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronDown size={18} style={{ color: '#1A3828' }} />
          </button>
        </div>
      )}

      {/* Input */}
      <div
        className="p-3 sm:p-4 shrink-0"
        style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: '#fff',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <ChatInput
          onSend={handleSend}
          onTyping={(typing) => {
            if (room?.id) notifyTyping(room.id, typing);
          }}
          disabled={isSending}
        />
      </div>
    </div>
  );
};
