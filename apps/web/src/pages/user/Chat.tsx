// filepath: apps/web/src/pages/user/Chat.tsx
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chat.store';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Lock, ImageOff } from 'lucide-react';

export const UserChat = () => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, setMessages, setUnreadCount } = useChatStore();
  const queryClient = useQueryClient();

  const { data: room, isLoading } = useQuery({
    queryKey: ['chat', 'my-room'],
    queryFn: chatApi.getMyRoom,
  });

  const { sendMessage, markAsRead, notifyTyping } = useChat(room?.id, () => {
    // Admin deleted this room — reset UI and refetch (getMyRoom creates a new room automatically)
    setMessages([]);
    setUnreadCount(0);
    // Query key must match the useQuery above — verified in Step 5.0
    queryClient.invalidateQueries({ queryKey: ['chat', 'my-room'] });
  });

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(20,40,28,0.5)' }}>
        Ładowanie czatu...
      </div>
    );
  }

  const firstUnreadIndex = messages.findIndex(
    (m) => m.readAt == null && m.senderId !== user?.id
  );

  return (
    <div
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
      data-tour="chat-window"
      style={{
        borderRadius: 20,
        border: '1px solid rgba(0,0,0,0.07)',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <h2 className="font-heading font-bold text-xl" style={{ color: '#1A3828' }}>
          Czat z konsultantem
        </h2>
        <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>
          Odpowiemy najszybciej jak to możliwe
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3"
        style={{ background: 'rgba(232,243,234,0.5)' }}
      >
        {/* Privacy notice */}
        <div className="flex flex-col items-center gap-3 py-4 px-2 text-center select-none">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(196,150,90,0.1)' }}
          >
            <ShieldCheck size={24} style={{ color: '#C4965A' }} />
          </div>
          <p className="text-xs font-semibold" style={{ color: '#1A3828' }}>
            Twoja prywatność jest chroniona
          </p>
          <div className="flex flex-col gap-1.5 text-xs max-w-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
            <span className="flex items-center gap-1.5 justify-center">
              <Lock size={11} className="shrink-0" />
              Wiadomości są szyfrowane i widoczne wyłącznie dla Ciebie oraz konsultanta.
            </span>
            <span className="flex items-center gap-1.5 justify-center">
              <ImageOff size={11} className="shrink-0" />
              Zdjęcia i pliki nie są udostępniane osobom trzecim ani wykorzystywane w żadnym innym celu.
            </span>
          </div>
          <div className="w-16 h-px mt-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
        </div>

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
          />
        ))}
      </div>

      {/* Input */}
      <div
        className="p-4"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff' }}
      >
        <ChatInput
          onSend={(content, file) => {
            if (room?.id) sendMessage(content, room.id, file);
          }}
          onTyping={(isTyping) => {
            if (room?.id) notifyTyping(room.id, isTyping);
          }}
        />
      </div>
    </div>
  );
};
