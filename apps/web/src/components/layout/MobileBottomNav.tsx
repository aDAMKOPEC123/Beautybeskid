import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chat.store';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi } from '@/api/notifications.api';
import { homecareApi } from '@/api/homecare.api';
import {
  LayoutDashboard, Calendar, Plus, MessageCircle, X,
  Bell, User as UserIcon, Star, BookOpen, ShoppingBag,
  Users, Sparkles, GraduationCap, Cloud, Clock,
} from 'lucide-react';

const MORE_LINKS = [
  { to: '/user/lojalnosc', label: 'Punkty', icon: Star },
  { to: '/user/historia', label: 'Historia', icon: Clock },
  { to: '/user/dziennik', label: 'Dziennik', icon: BookOpen, badge: 'journal' as const },
  { to: '/user/rutyna', label: 'Rutyna', icon: Sparkles, badge: 'routine' as const },
  { to: '/user/produkty', label: 'Produkty', icon: ShoppingBag },
  { to: '/user/polecenia', label: 'Polecenia', icon: Users },
  { to: '/user/pogoda-skory', label: 'Skóra', icon: Cloud },
  { to: '/akademia', label: 'Akademia', icon: GraduationCap },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell, badge: 'notif' as const },
  { to: '/user/profil', label: 'Profil', icon: UserIcon },
];

export function MobileBottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useChatStore();

  const { data: journalUnread = 0 } = useQuery<number>({
    queryKey: ['journal', 'unread'],
    queryFn: skinJournalApi.getUnreadCount,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: notifUnread = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: routineUnread = 0 } = useQuery<number>({
    queryKey: ['homecare-unread'],
    queryFn: () => homecareApi.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

  const getBadge = (badge?: 'journal' | 'routine' | 'notif') => {
    if (badge === 'journal') return journalUnread;
    if (badge === 'routine') return routineUnread;
    if (badge === 'notif') return notifUnread;
    return 0;
  };

  const totalMoreBadge = journalUnread + routineUnread + notifUnread;

  return (
    <>
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      {isMoreOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 z-50 md:hidden rounded-t-2xl p-4 shadow-xl"
          style={{ background: '#F4F9F5', borderTop: '1px solid rgba(0,0,0,0.07)' }}
        >
          <div className="grid grid-cols-4 gap-2">
            {MORE_LINKS.map(({ to, label, icon: Icon, badge }) => {
              const count = getBadge(badge);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 p-2 rounded-xl text-xs',
                    isActive(to) ? 'font-semibold' : 'opacity-60'
                  )}
                  style={{ color: isActive(to) ? '#C4965A' : '#1A3828' }}
                >
                  <Icon size={22} />
                  <span className="text-center leading-tight">{label}</span>
                  {count > 0 && (
                    <span
                      className="absolute top-1 right-1 text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1"
                      style={{ background: '#C4965A', color: '#fff' }}
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around px-2"
        style={{
          height: '64px',
          background: '#F4F9F5',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Link
          to="/user"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isActive('/user') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          <LayoutDashboard size={22} />
          <span>Główna</span>
        </Link>

        <Link
          to="/user/wizyty"
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isActive('/user/wizyty') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          <Calendar size={22} />
          <span>Wizyty</span>
        </Link>

        <Link
          to="/rezerwacja"
          className="flex items-center justify-center rounded-full w-12 h-12 -mt-4 shadow-md transition-transform active:scale-95"
          style={{ background: '#1A3828', color: '#fff' }}
        >
          <Plus size={24} />
        </Link>

        <Link
          to="/user/chat"
          className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isActive('/user/chat') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          <MessageCircle size={22} />
          <span>Czat</span>
          {unreadCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 text-[9px] rounded-full min-w-[14px] h-3.5 flex items-center justify-center font-bold px-0.5"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isMoreOpen ? <X size={22} /> : <UserIcon size={22} />}
          <span>Więcej</span>
          {totalMoreBadge > 0 && !isMoreOpen && (
            <span
              className="absolute top-0.5 right-0.5 text-[9px] rounded-full min-w-[14px] h-3.5 flex items-center justify-center font-bold px-0.5"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {totalMoreBadge > 9 ? '9+' : totalMoreBadge}
            </span>
          )}
        </button>
      </nav>
    </>
  );
}
