// filepath: apps/web/src/components/layout/UserLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/axios';
import { discountCodesApi } from '@/api/discount-codes.api';
import { authApi } from '@/api/auth.api';
import { chatApi } from '@/api/chat.api';
import type { ChatMessagePayload } from '@cosmo/shared';
import { MobileBottomNav } from './MobileBottomNav';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { PageSEO } from '@/components/shared/SEO';
import { useChatStore } from '@/store/chat.store';
import { useSocket } from '@/hooks/useSocket';
import { getSocket } from '@/lib/socket';
import { useAchievementNotifications } from '@/components/achievements/AchievementToast';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { useTour } from '@/hooks/useTour';
import { ReviewPromptModal } from '@/components/reviews/ReviewPromptModal';
import { usePushSubscription, unsubscribeCurrentPushSubscription } from '@/hooks/usePushSubscription';
import { PushPermissionPrompt } from '@/components/push/PushPermissionPrompt';
import { PasskeySetupPrompt } from '@/components/auth/PasskeySetupPrompt';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { TourProvider } from '@/contexts/TourContext';
import {
  canPromptForPwaInstall,
  isMobileBrowser,
  PWA_INSTALL_PROMPT_EVENT,
  type PwaInstallPromptDetail,
  type PwaInstallPromptReason,
} from '@/hooks/usePwaInstall';
import { useUserMenuBadges } from '@/hooks/useUserMenuBadges';
import {
  Globe,
  LayoutDashboard,
  Calendar,
  Star,
  Clock,
  BookOpen,
  ShoppingBag,
  Users,
  Bell,
  User as UserIcon,
  Sparkles,
  MessageCircle,
  Cloud,
  GraduationCap,
  Flower2,
  MessageSquare,
  Gift,
  BadgePercent,
  LogOut,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Najważniejsze',
    links: [
      { to: '/user', label: 'Pulpit', icon: LayoutDashboard },
      { to: '/user/wizyty', label: 'Moje wizyty', icon: Calendar },
      { to: '/user/lojalnosc', label: 'Punkty i nagrody', icon: Star },
      { to: '/user/chat', label: 'Czat z gabinetem', icon: MessageCircle },
    ],
  },
  {
    label: 'Moja pielęgnacja',
    links: [
      { to: '/user/historia', label: 'Historia zabiegów', icon: Clock },
      { to: '/user/dziennik', label: 'Dziennik skóry', icon: BookOpen },
      { to: '/user/rutyna', label: 'Rutyna domowa', icon: Sparkles },
      { to: '/user/produkty', label: 'Moje produkty', icon: ShoppingBag },
      { to: '/user/pogoda-skory', label: 'Profil skóry', icon: Cloud },
      { to: '/user/zalecenia', label: 'Beauty Plan', icon: Flower2 },
    ],
  },
  {
    label: 'Więcej',
    links: [
      { to: '/user/polecenia', label: 'Program poleceń', icon: Users },
      { to: '/user/vouchery', label: 'Vouchery', icon: Gift },
      { to: '/user/promocje-sklepowe', label: 'Promocje sklepowe', icon: BadgePercent },
      { to: '/user/forum', label: 'Forum', icon: MessageSquare },
      { to: '/akademia', label: 'Akademia', icon: GraduationCap },
      { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
      { to: '/user/profil', label: 'Ustawienia konta', icon: UserIcon },
    ],
  },
] as const;

const USER_PAGE_TITLES: Record<string, string> = {
  '/user': 'Panel klienta',
  '/user/wizyty': 'Moje wizyty',
  '/user/lojalnosc': 'Punkty i nagrody',
  '/user/chat': 'Czat z gabinetem',
  '/user/historia': 'Historia zabiegów',
  '/user/dziennik': 'Dziennik skóry',
  '/user/rutyna': 'Rutyna domowa',
  '/user/produkty': 'Moje produkty',
  '/user/pogoda-skory': 'Profil skóry',
  '/user/zalecenia': 'Beauty Plan',
  '/user/polecenia': 'Program poleceń',
  '/user/vouchery': 'Vouchery',
  '/user/promocje-sklepowe': 'Promocje sklepowe',
  '/user/forum': 'Forum klientek',
  '/user/powiadomienia': 'Powiadomienia',
  '/user/profil': 'Ustawienia konta',
  '/user/zmien-haslo': 'Zmiana hasła',
};

const getUserPageTitle = (pathname: string) => {
  const exactTitle = USER_PAGE_TITLES[pathname];
  if (exactTitle) return exactTitle;
  const parentPath = Object.keys(USER_PAGE_TITLES)
    .filter((path) => path !== '/user' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return parentPath ? USER_PAGE_TITLES[parentPath] : 'Panel klienta';
};

const panelPageVariants = {
  initial: { opacity: 0, y: 18, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.998,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const panelPageReducedVariants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -2,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

const UserLayoutInner = () => {
  const { isAuthenticated, isLoading, user: storeUser, setUser, logout, isAdmin, isEmployee } = useAuth();
  const storeUserRef = useRef(storeUser);
  storeUserRef.current = storeUser;
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    await unsubscribeCurrentPushSubscription();
    logout();
    navigate('/');
  };
  const { incrementUnread, setUnreadCount } = useChatStore();
  const queryClient = useQueryClient();
  const { data: chatRoom } = useQuery({
    queryKey: ['chat', 'my-room'],
    queryFn: chatApi.getMyRoom,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const { getBadgeCount } = useUserMenuBadges();
  const shouldReduce = useReducedMotion();
  const activePageVariants = shouldReduce ? panelPageReducedVariants : panelPageVariants;
  const navIndicatorTransition = shouldReduce
    ? { duration: 0.16, ease: 'easeOut' }
    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

  useEffect(() => {
    if (!chatRoom || !storeUser) return;
    const serverUnread = (chatRoom.messages as ChatMessagePayload[])
      ?.filter((m) => m.readAt == null && m.senderId !== storeUser.id)
      .length ?? 0;
    setUnreadCount(serverUnread);
  }, [chatRoom?.messages, storeUser?.id, setUnreadCount]);

  const { isConnected } = useSocket();
  const location = useLocation();
  useAchievementNotifications();
  useReviewPrompt();

  const { data: welcomeCoupon } = useQuery({
    queryKey: ['discount-codes', 'welcome'],
    queryFn: discountCodesApi.getWelcomeCoupon,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const { data: freshUser } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data.user;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (freshUser && storeUserRef.current) {
      setUser({ ...storeUserRef.current, ...freshUser });
    }
  }, [freshUser, setUser]);

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();

  const { startTour } = useTour();
  const tourStartedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && freshUser !== undefined && freshUser.onboardingCompleted === false && !tourStartedRef.current) {
      tourStartedRef.current = true;
      startTour();
    }
  }, [isAuthenticated, freshUser, startTour]);

  useEffect(() => {
    if (!isAuthenticated || !isMobileBrowser() || !canPromptForPwaInstall()) return;

    const stateReason = (location.state as { pwaPromptReason?: PwaInstallPromptReason } | null)?.pwaPromptReason;
    const reason: PwaInstallPromptReason | null =
      stateReason ?? (location.pathname === '/user/wizyty' ? 'appointments' : null);

    if (!reason) return;

    const sessionKey = `pwa-install-reminder-${reason}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // sessionStorage may be unavailable in private browsing.
    }

    const timer = window.setTimeout(() => {
      if (!canPromptForPwaInstall()) return;
      window.dispatchEvent(
        new CustomEvent<PwaInstallPromptDetail>(PWA_INSTALL_PROMPT_EVENT, {
          detail: { reason },
        }),
      );
    }, reason === 'booking-success' ? 600 : 1000);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, location.pathname, location.state]);

  useEffect(() => {
    if (
      isAuthenticated &&
      isSupported &&
      !isSubscribed &&
      permission !== 'denied' &&
      !localStorage.getItem('push_prompt_shown')
    ) {
      const timer = setTimeout(() => setShowPushPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isSupported, isSubscribed, permission]);

  useEffect(() => {
    if (!isConnected) return;
    const sock = getSocket();
    const onMessage = () => {
      if (!location.pathname.startsWith('/user/chat')) {
        incrementUnread();
      }
    };
    sock.on('chat:message', onMessage);
    return () => { sock.off('chat:message', onMessage); };
  }, [isConnected, location.pathname, incrementUnread]);

  useEffect(() => {
    if (!isConnected) return;
    const sock = getSocket();
    const onJournalComment = ({ authorName }: { entryId: string; authorName: string }) => {
      queryClient.invalidateQueries({ queryKey: ['journal', 'unread'] });
      toast('💬 Nowy komentarz kosmetologa', {
        description: `${authorName} dodał(a) komentarz do Twojego dziennika`,
        duration: 5000,
        action: {
          label: 'Zobacz',
          onClick: () => { navigate('/user/dziennik'); },
        },
      });
    };
    const onNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-map'] });
      queryClient.invalidateQueries({ queryKey: ['homecare-unread'] });
    };
    sock.on('journal:new-comment', onJournalComment);
    sock.on('notification:new', onNotificationNew);
    return () => {
      sock.off('journal:new-comment', onJournalComment);
      sock.off('notification:new', onNotificationNew);
    };
  }, [isConnected, queryClient]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location.pathname + location.search }} replace />;

  // Force password change for admin-created accounts
  if (storeUser?.mustChangePassword && location.pathname !== '/user/zmien-haslo') {
    return <Navigate to="/user/zmien-haslo" replace />;
  }
  // Prevent accessing change-password page when not needed
  if (!storeUser?.mustChangePassword && location.pathname === '/user/zmien-haslo') {
    return <Navigate to="/user/wizyty" replace />;
  }

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);
  const isTaskFlow = location.pathname === '/rezerwacja' || location.pathname.startsWith('/user/chat');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSEO
        title={`${getUserPageTitle(location.pathname)} | BeskidStudio`}
        description="Prywatna sekcja panelu klienta BeskidStudio."
        canonical={location.pathname}
        noIndex
      />
      <ScrollToTop />
      <header
        className="sticky top-0 z-50 flex items-center"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(64px + env(safe-area-inset-top))',
          background: 'linear-gradient(135deg, #1A3828 0%, #243f30 100%)',
          borderBottom: '2px solid #C4965A',
          boxShadow: '0 2px 16px rgba(26,56,40,0.18)',
        }}
      >
        <div className="container flex items-center justify-between">
          <Link
            to="/user"
            className="font-display text-[13px] tracking-[0.45em] uppercase"
            style={{ color: '#F0EDE6', fontStyle: 'normal', fontWeight: 300, letterSpacing: '0.45em' }}
          >
            BeskidStudio
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-80"
                style={{ color: '#C4965A', fontWeight: 600 }}
              >
                Panel Admina
              </Link>
            )}
            {!isAdmin && isEmployee && (
              <Link
                to="/employee"
                className="text-[10px] tracking-[0.2em] uppercase transition-opacity hover:opacity-80"
                style={{ color: '#C4965A', fontWeight: 600 }}
              >
                Panel Pracownika
              </Link>
            )}
            <Link
              to="/user/profil"
              className="min-h-11 inline-flex items-center gap-2 rounded-full px-3 text-sm transition-colors hover:bg-white/10"
              style={{ color: 'rgba(240,237,230,0.82)' }}
              aria-label="Otwórz ustawienia konta"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(196,150,90,0.18)', color: '#D9B57B' }}>
                <UserIcon size={15} />
              </span>
              <span className="hidden sm:inline max-w-36 truncate">{storeUser?.name}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="min-h-11 inline-flex items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors hover:bg-white/10"
              style={{ color: 'rgba(240,237,230,0.78)' }}
              aria-label="Wyloguj się"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>
      </header>

      {welcomeCoupon && (
        <Link
          to={`/rezerwacja?code=${welcomeCoupon.code}`}
          className="block text-center py-2.5 px-4 text-sm border-b transition-opacity hover:opacity-80"
          style={{
            background: 'rgba(196,150,90,0.08)',
            borderColor: 'rgba(196,150,90,0.2)',
            color: 'rgba(20,40,28,0.7)',
          }}
        >
          Masz kod rabatowy dla nowego użytkownika:{' '}
          <strong className="font-mono tracking-wider" style={{ color: '#C4965A' }}>
            {welcomeCoupon.code}
          </strong>
          {' — '}
          {welcomeCoupon.discountType === 'PERCENTAGE'
            ? `${welcomeCoupon.discountValue}% zniżki`
            : `${Number(welcomeCoupon.discountValue).toFixed(2)} zł zniżki`}
          {' '}· Kliknij, aby zarezerwować wizytę z rabatem!
        </Link>
      )}

      <div className="container flex-1 flex py-6 lg:py-8 gap-8">
        <aside
          className="w-64 hidden lg:flex flex-col gap-4 pr-4 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain"
          style={{ borderRight: '1px solid rgba(0,0,0,0.08)' }}
        >
          <nav className="flex flex-col gap-4" aria-label="Menu panelu klienta">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(20,40,28,0.46)' }}>
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.links.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="relative isolate min-h-11 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5 flex items-center gap-3 justify-between"
                      style={isActive(to) ? { color: '#9A6C32', fontWeight: 700 } : { color: 'rgba(20,40,28,0.72)' }}
                    >
                      {isActive(to) && (
                        <motion.span
                          layoutId="user-sidebar-active-pill"
                          className="absolute inset-0 rounded-xl"
                          transition={navIndicatorTransition}
                          style={{
                            background: 'linear-gradient(135deg, rgba(196,150,90,0.18) 0%, rgba(196,150,90,0.08) 100%)',
                            boxShadow: 'inset 0 0 0 1px rgba(196,150,90,0.18)',
                          }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-3">
                        <Icon size={18} />
                        <span>{label}</span>
                      </span>
                      {getBadgeCount(to) > 0 && (
                        <span className="relative z-10 text-xs rounded-full px-1.5 py-0.5 font-bold" style={{ background: '#C4965A', color: '#fff' }}>
                          {getBadgeCount(to) > 9 ? '9+' : getBadgeCount(to)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4">
            <Link
              to="/rezerwacja"
              data-tour="sidebar-booking-btn"
              className="block w-full text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all"
              style={{ background: '#1A3828', color: '#fff' }}
            >
              + Umów wizytę
            </Link>
            <Link
              to="/"
              state={{ fromPanel: true }}
              className="px-4 py-2.5 rounded-xl text-sm transition-all duration-300 flex items-center gap-3 mt-1"
              style={{ color: 'rgba(20,40,28,0.45)' }}
            >
              <Globe size={18} />
              <span>Wróć na stronę główną</span>
            </Link>
          </div>
        </aside>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            className="flex-1 min-w-0"
            variants={activePageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ transformOrigin: 'top center' }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>

      {!isTaskFlow && <footer className="border-t" style={{ borderColor: 'rgba(26,56,40,0.09)', background: 'rgba(255,255,255,0.58)' }}>
        <div className="container flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ color: 'rgba(20,40,28,0.62)' }}>
          <p>© {new Date().getFullYear()} BeskidStudio By Wiktoria Ćwik</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Linki pomocnicze panelu">
            <Link to="/kontakt" className="transition-colors hover:text-foreground">Kontakt</Link>
            <Link to="/regulamin" className="transition-colors hover:text-foreground">Regulamin i prywatność</Link>
            <Link to="/" state={{ fromPanel: true }} className="transition-colors hover:text-foreground">Strona główna</Link>
          </nav>
        </div>
      </footer>}
      <div className="h-16 lg:hidden" aria-hidden="true" />
      <ReviewPromptModal />
      <MobileBottomNav />
      <PwaInstallButton />
      <PasskeySetupPrompt user={storeUser} />
      {showPushPrompt && (
        <PushPermissionPrompt
          onSubscribe={async () => {
            await subscribe();
            setShowPushPrompt(false);
          }}
          onDismiss={() => setShowPushPrompt(false)}
        />
      )}
    </div>
  );
};

export const UserLayout = () => (
  <TourProvider>
    <UserLayoutInner />
  </TourProvider>
);
