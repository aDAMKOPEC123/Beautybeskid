// filepath: apps/web/src/pages/employee/Chat.tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chat.store';
import { useAuth } from '@/hooks/useAuth';
import { Search } from 'lucide-react';

export const EmployeeChat = () => {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { sendMessage, markAsRead, notifyTyping } = useChat(activeRoom?.id);

  const { data: rooms, refetch: refetchRooms } = useQuery({
    queryKey: ['employee', 'chatRooms'],
    queryFn: chatApi.getRooms,
  });

  // Listen for new messages to refresh room list
  const { messages: storeMessages } = useChatStore();
  useEffect(() => {
    refetchRooms();
  }, [storeMessages.length]);

  const loadRoom = async (room: any) => {
    setActiveRoom(room);
    const msgs = await chatApi.getRoomMessages(room.id);
    setMessages(msgs);
    markAsRead(room.id);
    // Update local messages with socket messages too
  };

  // Append incoming socket messages for active room
  useEffect(() => {
    if (!activeRoom || storeMessages.length === 0) return;
    const latest = storeMessages[storeMessages.length - 1];
    if (latest?.roomId === activeRoom.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === latest.id)) return prev;
        return [...prev, latest];
      });
    }
  }, [storeMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border bg-background shadow-2xl">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/20 flex flex-col">
        <div className="p-6 border-b bg-card">
          <h2 className="font-heading font-bold text-2xl text-primary mb-4">Wiadomości</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Szukaj klienta..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-full focus:outline-none focus:ring-2 ring-primary/30 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms?.map((room: any) => (
            <button
              key={room.id}
              onClick={() => loadRoom(room)}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-300 ${
                activeRoom?.id === room.id
                  ? 'bg-primary text-primary-foreground shadow-lg scale-[0.98]'
                  : room.adminUnread > 0
                  ? 'bg-primary/5 border-l-2 border-primary font-medium hover:bg-primary/10'
                  : 'hover:bg-background border border-transparent hover:border-border hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold">{room.user.name}</span>
                {room.adminUnread > 0 && (
                  <span className="bg-destructive text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {room.adminUnread}
                  </span>
                )}
              </div>
              <span
                className={`text-xs block font-medium ${
                  activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}
              >
                {new Date(room.lastMessageAt).toLocaleString('pl-PL')}
              </span>
            </button>
          ))}
          {rooms?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium">
              Brak konwersacji
            </div>
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col bg-card/50 relative">
        {activeRoom ? (
          <>
            <div className="p-6 border-b bg-background flex items-center shadow-sm z-10">
              <h3 className="font-bold text-xl">{activeRoom.user.name}</h3>
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full ml-3">
                Czat na żywo
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-muted/10" ref={scrollRef}>
              {messages.map((msg, idx) => {
                const firstUnread =
                  idx > 0 &&
                  msg.readAt == null &&
                  msg.senderId !== user?.id &&
                  messages[idx - 1]?.readAt != null;
                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender?.role === 'ADMIN' || msg.sender?.role === 'EMPLOYEE'}
                    showNewMarker={firstUnread}
                  />
                );
              })}
            </div>

            <div className="p-5 border-t bg-background">
              <ChatInput
                onSend={(content, file) => sendMessage(content, activeRoom.id, file)}
                onTyping={(isT) => notifyTyping(activeRoom.id, isT)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 text-muted-foreground flex-col p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-4xl shadow-inner border border-primary/20">
              💬
            </div>
            <h3 className="font-heading font-bold text-2xl text-foreground mb-2">Wybierz konwersację</h3>
            <p className="font-medium max-w-sm">
              Wybierz klienta z listy po lewej, aby odpowiedzieć na jego zapytanie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
