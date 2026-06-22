import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi, type NotificationUnreadMap } from '@/api/notifications.api';
import { homecareApi } from '@/api/homecare.api';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chat.store';

const MENU_NOTIFICATION_PATHS = [
  '/user/wizyty',
  '/user/lojalnosc',
  '/user/historia',
  '/user/dziennik',
  '/user/rutyna',
  '/user/produkty',
  '/user/polecenia',
  '/user/pogoda-skory',
  '/user/zalecenia',
  '/akademia',
  '/user/profil',
  '/user/chat',
] as const;

const matchesPath = (pathname: string, menuPath: string) =>
  pathname === menuPath || pathname.startsWith(`${menuPath}/`);

const findMenuPathForNotification = (pathname: string) =>
  [...MENU_NOTIFICATION_PATHS]
    .sort((left, right) => right.length - left.length)
    .find((menuPath) => matchesPath(pathname, menuPath));

export const useUserMenuBadges = () => {
  const { isAuthenticated } = useAuth();
  const { unreadCount: chatUnread } = useChatStore();

  const { data: journalUnread = 0 } = useQuery<number>({
    queryKey: ['journal', 'unread'],
    queryFn: skinJournalApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { data: notifUnread = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { data: routeUnreadMap = {} } = useQuery<NotificationUnreadMap>({
    queryKey: ['notifications', 'unread-map'],
    queryFn: () => notificationsApi.getUnreadMap(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { data: routineUnread = 0 } = useQuery<number>({
    queryKey: ['homecare-unread'],
    queryFn: () => homecareApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 30_000,
  });

  const { counts, moreBadge } = useMemo(() => {
    const routeMenuCounts = Object.entries(routeUnreadMap).reduce<Record<string, number>>(
      (acc, [pathname, count]) => {
        const menuPath = findMenuPathForNotification(pathname);
        if (!menuPath) return acc;

        acc[menuPath] = (acc[menuPath] ?? 0) + count;
        return acc;
      },
      {},
    );

    const getRouteCount = (path: string) => routeMenuCounts[path] ?? 0;

    const nextCounts: Record<string, number> = {
      '/user/wizyty': getRouteCount('/user/wizyty'),
      '/user/lojalnosc': getRouteCount('/user/lojalnosc'),
      '/user/historia': getRouteCount('/user/historia'),
      '/user/dziennik': journalUnread,
      '/user/rutyna': routineUnread,
      '/user/produkty': getRouteCount('/user/produkty'),
      '/user/polecenia': getRouteCount('/user/polecenia'),
      '/user/pogoda-skory': getRouteCount('/user/pogoda-skory'),
      '/user/zalecenia': getRouteCount('/user/zalecenia'),
      '/akademia': getRouteCount('/akademia'),
      '/user/powiadomienia': notifUnread,
      '/user/profil': getRouteCount('/user/profil'),
      '/user/chat': chatUnread,
    };

    const hiddenNotificationCount = Math.max(
      0,
      notifUnread - getRouteCount('/user/wizyty') - getRouteCount('/user/chat'),
    );

    const hiddenDedicatedExtras =
      Math.max(0, journalUnread - getRouteCount('/user/dziennik')) +
      Math.max(0, routineUnread - getRouteCount('/user/rutyna'));

    return {
      counts: nextCounts,
      moreBadge: hiddenNotificationCount + hiddenDedicatedExtras,
    };
  }, [chatUnread, journalUnread, notifUnread, routeUnreadMap, routineUnread]);

  return {
    getBadgeCount: (path: string) => counts[path] ?? 0,
    moreBadge,
  };
};
