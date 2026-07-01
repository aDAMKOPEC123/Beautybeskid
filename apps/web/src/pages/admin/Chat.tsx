// filepath: apps/web/src/pages/admin/Chat.tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/api/chat.api';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { BookingProposalPanel } from '@/components/chat/BookingProposalPanel';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chat.store';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Search, CalendarClock, Trash2 } from 'lucide-react';

export const AdminChat = () => {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [showProposal, setShowProposal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { sendMessage, markAsRead, notifyTyping } = useChat(activeRoom?.id);
  const { messages: storeMessages } = useChatStore();

  const { data: rooms, refetch: refetchRooms } = useQuery({
    queryKey: ['admin', 'chatRooms'],
    queryFn: chatApi.getRooms,
  });

  // Refresh room list when messages change (to update unread counts)
  useEffect(() => {
    refetchRooms();
  }, [storeMessages.length]);

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

  const handleDeleteRoom = async (e: React.MouseEvent, room: any) => {
    e.stopPropagation(); // Prevents triggering loadRoom on the parent button
    const confirmed = window.confirm(
      `Usunąć całą historię czatu z ${room.user.name}? Tej operacji nie można cofnąć.`
    );
    if (!confirmed) return;

    try {
      await chatApi.deleteRoom(room.id);
      // If the deleted room is currently open, reset the main view
      if (activeRoom?.id === room.id) {
        setActiveRoom(null);
        setMessages([]);
      }
      // Refresh the room list to remove the deleted room from the sidebar
      refetchRooms();
    } catch {
      window.alert('Nie udało się usunąć czatu. Spróbuj ponownie.');
    }
  };

  const loadRoom = async (room: any) => {
    setActiveRoom(room);
    const msgs = await chatApi.getRoomMessages(room.id);
    setMessages(msgs);
    markAsRead(room.id);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-165px)] min-h-[480px] overflow-hidden rounded-xl border bg-background shadow-2xl animate-enter md:h-[calc(100vh-8rem)] md:rounded-3xl">
      {/* Sidebar: Chat List */}
      <div className={`${activeRoom ? 'hidden md:flex' : 'flex'} w-full flex-col border-r bg-muted/20 md:w-80`}>
        <div className="border-b bg-card p-4 md:p-6">
          <h2 className="font-heading font-bold text-2xl text-primary mb-4">Wiadomości</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Szukaj dzwoniącego..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-full focus:outline-none focus:ring-2 ring-primary/30 transition-all font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
          {rooms?.map((room: any) => (
            <div key={room.id} className="relative group">
              <button
                onClick={() => loadRoom(room)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 pr-10 ${
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
                    <span className="bg-destructive text-white text-[10px] shadow-sm font-black px-2 py-0.5 rounded-full animate-pulse">
                      {room.adminUnread} Nowych
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1 block font-medium ${
                    activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}
                >
                  {new Date(room.lastMessageAt).toLocaleString('pl-PL')}
                </span>
              </button>
              <button
                onClick={(e) => handleDeleteRoom(e, room)}
                title="Usuń historię czatu"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {rooms?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium">
              Brak toczących się konwersacji
            </div>
          )}
        </div>
      </div>

      {/* Main: Chat View */}
      <div className={`${activeRoom ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-card/50 relative`}>
        {activeRoom ? (
          <>
            <div className="z-10 flex items-center gap-3 border-b bg-background p-3 shadow-sm md:p-6">
              <button
                type="button"
                onClick={() => setActiveRoom(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-primary md:hidden"
                aria-label="Wróć do listy rozmów"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="min-w-0 truncate font-bold text-lg md:text-xl">
                {activeRoom.user.name}
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full ml-3 hidden sm:inline-block">
                  Czat na żywo
                </span>
              </h3>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/10 p-3 md:gap-5 md:p-6" ref={scrollRef}>
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

            <div className="space-y-3 border-t bg-background p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] md:p-5">
              {showProposal && (
                <BookingProposalPanel
                  onSend={(message) => sendMessage(message, activeRoom.id)}
                  onClose={() => setShowProposal(false)}
                />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProposal((v) => !v)}
                  title="Zaproponuj termin"
                  className="shrink-0 p-2 rounded-lg border transition-colors hover:bg-accent"
                  style={showProposal ? { background: 'rgba(196,150,90,0.1)', borderColor: 'rgba(196,150,90,0.4)', color: '#C4965A' } : { color: 'rgba(0,0,0,0.4)' }}
                >
                  <CalendarClock size={18} />
                </button>
                <div className="flex-1">
                  <ChatInput
                    onSend={(content, file) => sendMessage(content, activeRoom.id, file)}
                    onTyping={(isT) => notifyTyping(activeRoom.id, isT)}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 text-muted-foreground flex-col p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-4xl shadow-inner border border-primary/20">
              💬
            </div>
            <h3 className="font-heading font-bold text-2xl text-foreground mb-2">Wybierz konwersację</h3>
            <p className="font-medium max-w-sm">
              Wybierz użytkownika z listy po lewej stronie, aby odpowiedzieć na jego zapytanie na żywo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
