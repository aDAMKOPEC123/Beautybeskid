// filepath: apps/web/src/components/layout/AdminLayout.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  ChevronDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageCircle,
  ScanFace,
  Settings,
  ShoppingBag,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { useSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/store/chat.store';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/api/consultations.api';
import { notificationsApi, type NotificationUnreadMap } from '@/api/notifications.api';

type MobileAdminLink = { to: string; label: string; badge?: number };

type DesktopNavLinkProps = {
  to: string;
  label: string;
  badge?: number;
  icon?: LucideIcon;
  end?: boolean;
  nested?: boolean;
};

const DesktopBadge = ({ count, muted = false }: { count?: number; muted?: boolean }) => {
  if (!count || count < 1) return null;

  return (
    <span
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
        muted ? 'bg-primary/10 text-primary' : 'bg-destructive text-white'
      }`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
};

const DesktopNavLink = ({
  to,
  label,
  badge,
  icon: Icon,
  end = false,
  nested = false,
}: DesktopNavLinkProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `relative flex items-center justify-between gap-3 rounded-md transition-colors ${
        nested ? 'min-h-9 px-3 py-2 text-[13px]' : 'min-h-10 px-3 py-2 text-sm font-medium'
      } ${
        isActive
          ? 'bg-primary/10 font-semibold text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {nested && (
          <span
            className={`absolute -left-[13px] h-5 w-0.5 rounded-full transition-colors ${
              isActive ? 'bg-primary' : 'bg-transparent'
            }`}
          />
        )}
        <span className="flex min-w-0 items-center gap-3">
          {Icon && <Icon size={17} strokeWidth={1.8} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <DesktopBadge count={badge} muted={isActive} />
      </>
    )}
  </NavLink>
);

type DesktopNavSectionProps = {
  label: string;
  icon: LucideIcon;
  open: boolean;
  active: boolean;
  badge?: number;
  onToggle: () => void;
  children: ReactNode;
};

const DesktopNavSection = ({
  label,
  icon: Icon,
  open,
  active,
  badge,
  onToggle,
  children,
}: DesktopNavSectionProps) => (
  <div className="space-y-1">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-accent/80 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon size={17} strokeWidth={1.8} className={active ? 'shrink-0 text-primary' : 'shrink-0'} />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!open && <DesktopBadge count={badge} />}
        <ChevronDown
          size={15}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </span>
    </button>
    {open && <div className="ml-5 space-y-0.5 border-l border-border/80 pl-3">{children}</div>}
  </div>
);

const isCurrentSection = (pathname: string, paths: readonly string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const ADMIN_NOTIFICATION_PATHS = [
  '/admin/wizyty',
  '/admin/konsultacje',
  '/admin/uzytkownicy',
  '/admin/recenzje',
  '/admin/chat',
] as const;

const countRouteNotifications = (counts: NotificationUnreadMap, path: string) =>
  Object.entries(counts).reduce(
    (total, [notificationPath, count]) =>
      notificationPath === path || notificationPath.startsWith(`${path}/`)
        ? total + count
        : total,
    0,
  );

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [komunikacjaOpen, setKomunikacjaOpen] = useState(
    () => ['/admin/powiadomienia', '/admin/chat'].some(p => location.pathname.startsWith(p))
  );
  const [wizytyOpen, setWizytyOpen] = useState(
    () => ['/admin/wizyty', '/admin/konsultacje', '/admin/pracownicy', '/admin/praca'].some(p => location.pathname.startsWith(p))
  );
  const [klienciOpen, setKlienciOpen] = useState(
    () => ['/admin/uzytkownicy', '/admin/recenzje', '/admin/beauty-plans'].some(p => location.pathname.startsWith(p))
  );
  const [tresciOpen, setTresciOpen] = useState(
    () => ['/admin/hero', '/admin/polecane-zabiegi', '/admin/o-nas', '/admin/uslugi', '/admin/blog', '/admin/metamorfozy'].some(p => location.pathname.startsWith(p))
  );
  const [diagnostykaOpen, setDiagnostykaOpen] = useState(
    () => ['/admin/quizy', '/admin/pogoda-skory'].some(p => location.pathname.startsWith(p))
  );
  const [sprzedazOpen, setSprzedazOpen] = useState(
    () => ['/admin/finanse', '/admin/kody-rabatowe', '/admin/promocje-sklepowe', '/admin/lojalnosc', '/admin/asortyment', '/admin/vouchery'].some(p => location.pathname.startsWith(p))
  );
  const { socket, isConnected } = useSocket();
  const { staffUnreadTotal, setStaffUnreadTotal } = useChatStore();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushSubscription();

  const { data: newLeads = [] } = useQuery({
    queryKey: ['admin', 'consultations', 'active'],
    queryFn: consultationsApi.getActive,
    refetchInterval: 60_000,
    enabled: isAuthenticated && isAdmin,
  });
  const newLeadsCount = newLeads.length;

  const { data: adminNotifUnread = 0 } = useQuery<number>({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 30_000,
  });

  const { data: routeUnreadMap = {} } = useQuery<NotificationUnreadMap>({
    queryKey: ['admin', 'notifications', 'unread-map'],
    queryFn: notificationsApi.getUnreadMap,
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 30_000,
  });

  const appointmentUnread = countRouteNotifications(routeUnreadMap, '/admin/wizyty');
  const consultationUnread = countRouteNotifications(routeUnreadMap, '/admin/konsultacje');
  const registrationUnread = countRouteNotifications(routeUnreadMap, '/admin/uzytkownicy');
  const reviewUnread = countRouteNotifications(routeUnreadMap, '/admin/recenzje');
  const chatNotificationUnread = countRouteNotifications(routeUnreadMap, '/admin/chat');
  const consultationBadge = Math.max(newLeadsCount, consultationUnread);
  const wizytySectionBadge = appointmentUnread + consultationBadge;
  const clientsBadge = registrationUnread + reviewUnread;
  const komunikacjaBadge = adminNotifUnread + Math.max(0, staffUnreadTotal - chatNotificationUnread);
  const appBadgeCount = Math.max(adminNotifUnread, staffUnreadTotal);

  const activeNotificationPath = ADMIN_NOTIFICATION_PATHS.find((path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  const activeRouteUnread = activeNotificationPath
    ? countRouteNotifications(routeUnreadMap, activeNotificationPath)
    : 0;

  useEffect(() => {
    if (!activeNotificationPath || activeRouteUnread === 0) return;

    notificationsApi.markRouteRead(activeNotificationPath).then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-map'] });
    }).catch((error) => {
      console.error('Failed to mark route notifications as read:', error);
    });
  }, [activeNotificationPath, activeRouteUnread, queryClient]);

  useEffect(() => {
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (appBadgeCount > 0) {
      void badgeNavigator.setAppBadge?.(appBadgeCount).catch(() => {});
    } else {
      void badgeNavigator.clearAppBadge?.().catch(() => {});
    }

    return () => {
      void badgeNavigator.clearAppBadge?.().catch(() => {});
    };
  }, [appBadgeCount]);

  useEffect(() => {
    const pathname = location.pathname;

    if (isCurrentSection(pathname, ['/admin/powiadomienia', '/admin/chat'])) setKomunikacjaOpen(true);
    if (isCurrentSection(pathname, ['/admin/wizyty', '/admin/konsultacje', '/admin/pracownicy', '/admin/praca'])) setWizytyOpen(true);
    if (isCurrentSection(pathname, ['/admin/uzytkownicy', '/admin/recenzje', '/admin/beauty-plans'])) setKlienciOpen(true);
    if (isCurrentSection(pathname, ['/admin/hero', '/admin/polecane-zabiegi', '/admin/o-nas', '/admin/uslugi', '/admin/blog', '/admin/metamorfozy'])) setTresciOpen(true);
    if (isCurrentSection(pathname, ['/admin/quizy', '/admin/pogoda-skory'])) setDiagnostykaOpen(true);
    if (isCurrentSection(pathname, ['/admin/finanse', '/admin/kody-rabatowe', '/admin/promocje-sklepowe', '/admin/lojalnosc', '/admin/asortyment', '/admin/vouchery'])) setSprzedazOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const onAdminUnread = (count: number) => setStaffUnreadTotal(count);

    const onCreated = (appt: any) => {
      toast.info(`Nowa wizyta: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onUpdated = (appt: any) => {
      toast.info(`Zmiana wizyty: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onDeleted = (id: string) => {
      toast.info(`Wizyta usunięta (ID: ${String(id).slice(0, 8)})`);
    };

    const onNotificationNew = (data: { unreadCount?: number }) => {
      if (typeof data?.unreadCount === 'number') {
        queryClient.setQueryData(['admin', 'notifications', 'unread-count'], data.unreadCount);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-map'] });
    };

    socket.on('admin:unread_count', onAdminUnread);
    socket.on('appointment:created', onCreated);
    socket.on('appointment:updated', onUpdated);
    socket.on('appointment:deleted', onDeleted);
    socket.on('notification:new', onNotificationNew);

    return () => {
      socket.off('admin:unread_count', onAdminUnread);
      socket.off('appointment:created', onCreated);
      socket.off('appointment:updated', onUpdated);
      socket.off('appointment:deleted', onDeleted);
      socket.off('notification:new', onNotificationNew);
    };
  }, [isConnected, socket, setStaffUnreadTotal, queryClient]);

  const mobileNavGroups: Array<{ label: string; links: MobileAdminLink[] }> = [
    { label: 'Start', links: [{ to: '/admin', label: 'Dashboard' }] },
    {
      label: 'Komunikacja',
      links: [
        { to: '/admin/powiadomienia', label: 'Powiadomienia', badge: adminNotifUnread },
        { to: '/admin/chat', label: 'Chat', badge: staffUnreadTotal },
      ],
    },
    {
      label: 'Wizyty i personel',
      links: [
        { to: '/admin/wizyty', label: 'Wizyty', badge: appointmentUnread },
        { to: '/admin/konsultacje', label: 'Konsultacje', badge: consultationBadge },
        { to: '/admin/pracownicy', label: 'Pracownicy' },
        { to: '/admin/praca', label: 'Praca' },
      ],
    },
    {
      label: 'Klienci',
      links: [
        { to: '/admin/uzytkownicy', label: 'Użytkownicy', badge: registrationUnread },
        { to: '/admin/recenzje', label: 'Recenzje', badge: reviewUnread },
        { to: '/admin/beauty-plans', label: 'Beauty Plans' },
      ],
    },
    {
      label: 'Treści',
      links: [
        { to: '/admin/hero', label: 'Slider strony głównej' },
        { to: '/admin/polecane-zabiegi', label: 'Polecane zabiegi' },
        { to: '/admin/o-nas', label: 'Strona „O nas”' },
        { to: '/admin/uslugi', label: 'Usługi' },
        { to: '/admin/blog', label: 'Blog' },
        { to: '/admin/metamorfozy', label: 'Metamorfozy' },
      ],
    },
    {
      label: 'Diagnostyka',
      links: [
        { to: '/admin/quizy', label: 'Quizy' },
        { to: '/admin/pogoda-skory', label: 'Pogoda skóry' },
      ],
    },
    {
      label: 'Sprzedaż',
      links: [
        { to: '/admin/kody-rabatowe', label: 'Kody rabatowe' },
        { to: '/admin/finanse', label: 'Finanse' },
        { to: '/admin/promocje-sklepowe', label: 'Promocje sklepowe' },
        { to: '/admin/vouchery', label: 'Vouchery' },
        { to: '/admin/lojalnosc', label: 'Program lojalnościowy' },
        { to: '/admin/asortyment', label: 'Asortyment' },
      ],
    },
    {
      label: 'Pozostałe',
      links: [
        { to: '/admin/akademia', label: 'Akademia' },
        { to: '/admin/forum', label: 'Forum' },
        { to: '/admin/marketing', label: 'Marketing' },
        { to: '/admin/regulamin', label: 'Regulamin' },
      ],
    },
  ];
  const mobileLinks = mobileNavGroups.flatMap((group) => group.links);
  const currentMobilePage = [...mobileLinks]
    .sort((a, b) => b.to.length - a.to.length)
    .find((link) => link.to === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(link.to));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const komunikacjaActive = isCurrentSection(location.pathname, ['/admin/powiadomienia', '/admin/chat']);
  const wizytyActive = isCurrentSection(location.pathname, ['/admin/wizyty', '/admin/konsultacje', '/admin/pracownicy', '/admin/praca']);
  const klienciActive = isCurrentSection(location.pathname, ['/admin/uzytkownicy', '/admin/recenzje', '/admin/beauty-plans']);
  const tresciActive = isCurrentSection(location.pathname, ['/admin/hero', '/admin/polecane-zabiegi', '/admin/o-nas', '/admin/uslugi', '/admin/blog', '/admin/metamorfozy']);
  const diagnostykaActive = isCurrentSection(location.pathname, ['/admin/quizy', '/admin/pogoda-skory']);
  const sprzedazActive = isCurrentSection(location.pathname, ['/admin/finanse', '/admin/kody-rabatowe', '/admin/promocje-sklepowe', '/admin/lojalnosc', '/admin/asortyment', '/admin/vouchery']);

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="admin-shell min-h-screen flex flex-col bg-muted/20" style={{ paddingTop: 'calc(72px + env(safe-area-inset-top))' }}>
      <ScrollToTop />
      <Navbar />
      <div className="md:hidden shrink-0 border-b bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Administracja</p>
            <p className="truncate text-sm font-semibold text-primary">
              {currentMobilePage?.label ?? 'Panel admina'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="relative flex min-h-11 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-semibold text-primary shadow-sm"
            aria-label="Otwórz menu panelu admina"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={18} />
            Menu
            {komunikacjaBadge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
                {komunikacjaBadge > 9 ? '9+' : komunikacjaBadge}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 top-[72px] z-[60] md:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Zamknij menu panelu admina"
          tabIndex={mobileMenuOpen ? 0 : -1}
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-espresso/45 backdrop-blur-sm transition-opacity ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-card shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          aria-label="Nawigacja panelu admina"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Panel admina</p>
              <p className="text-lg font-bold text-primary">Nawigacja</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-primary"
              aria-label="Zamknij menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {mobileNavGroups.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.links.map(({ to, label, badge }) => {
                    const isActive = to === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileMenuOpen(false)}
                        tabIndex={mobileMenuOpen ? 0 : -1}
                        className={`flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-accent'}`}
                      >
                        <span>{label}</span>
                        {badge != null && badge > 0 && (
                          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-destructive text-white'}`}>
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>

      {isSupported && !isSubscribed && permission !== 'denied' && (
        <div className="md:hidden px-3 py-2 border-b bg-card">
          <button
            onClick={subscribe}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <BellRing size={15} />
            Włącz powiadomienia push
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-card md:flex">
          <div className="border-b px-5 py-4">
            <p className="text-[11px] font-semibold uppercase text-primary/70">
              BeskidStudio
            </p>
            <p className="mt-1 font-heading text-base font-semibold text-foreground">
              Panel administracyjny
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
            <DesktopNavLink
              to="/admin"
              label="Dashboard"
              icon={LayoutDashboard}
              end
            />

            <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase text-muted-foreground/70">
              Zarządzanie
            </div>

            {/* Komunikacja */}
            <DesktopNavSection
              label="Komunikacja"
              icon={Bell}
              open={komunikacjaOpen}
              active={komunikacjaActive}
              badge={komunikacjaBadge}
              onToggle={() => setKomunikacjaOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/powiadomienia" label="Powiadomienia" badge={adminNotifUnread} nested />
              <DesktopNavLink to="/admin/chat" label="Chat" badge={staffUnreadTotal} nested />
            </DesktopNavSection>

            {/* Wizyty i personel */}
            <DesktopNavSection
              label="Wizyty i personel"
              icon={CalendarDays}
              open={wizytyOpen}
              active={wizytyActive}
              badge={wizytySectionBadge}
              onToggle={() => setWizytyOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/wizyty" label="Wizyty" badge={appointmentUnread} nested />
              <DesktopNavLink to="/admin/konsultacje" label="Konsultacje" badge={consultationBadge} nested />
              <DesktopNavLink to="/admin/pracownicy" label="Pracownicy" nested />
              <DesktopNavLink to="/admin/praca" label="Praca" nested />
            </DesktopNavSection>

            {/* Klienci */}
            <DesktopNavSection
              label="Klienci"
              icon={UsersRound}
              open={klienciOpen}
              active={klienciActive}
              badge={clientsBadge}
              onToggle={() => setKlienciOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/uzytkownicy" label="Użytkownicy" badge={registrationUnread} nested />
              <DesktopNavLink to="/admin/recenzje" label="Recenzje" badge={reviewUnread} nested />
              <DesktopNavLink to="/admin/beauty-plans" label="Beauty Plans" nested />
            </DesktopNavSection>

            {/* Treści */}
            <DesktopNavSection
              label="Treści"
              icon={FileText}
              open={tresciOpen}
              active={tresciActive}
              onToggle={() => setTresciOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/hero" label="Slider strony głównej" nested />
              <DesktopNavLink to="/admin/polecane-zabiegi" label="Polecane zabiegi" nested />
              <DesktopNavLink to="/admin/o-nas" label="Strona „O nas”" nested />
              <DesktopNavLink to="/admin/uslugi" label="Usługi" nested />
              <DesktopNavLink to="/admin/blog" label="Blog" nested />
              <DesktopNavLink to="/admin/metamorfozy" label="Metamorfozy" nested />
            </DesktopNavSection>

            {/* Diagnostyka */}
            <DesktopNavSection
              label="Diagnostyka"
              icon={ScanFace}
              open={diagnostykaOpen}
              active={diagnostykaActive}
              onToggle={() => setDiagnostykaOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/quizy" label="Quizy" nested />
              <DesktopNavLink to="/admin/pogoda-skory" label="Pogoda skóry" nested />
            </DesktopNavSection>

            {/* Sprzedaż */}
            <DesktopNavSection
              label="Sprzedaż"
              icon={ShoppingBag}
              open={sprzedazOpen}
              active={sprzedazActive}
              onToggle={() => setSprzedazOpen((open) => !open)}
            >
              <DesktopNavLink to="/admin/kody-rabatowe" label="Kody rabatowe" nested />
              <DesktopNavLink to="/admin/finanse" label="Finanse" nested />
              <DesktopNavLink to="/admin/promocje-sklepowe" label="Promocje sklepowe" nested />
              <DesktopNavLink to="/admin/vouchery" label="Vouchery" nested />
              <DesktopNavLink to="/admin/lojalnosc" label="Program lojalnościowy" nested />
              <DesktopNavLink to="/admin/asortyment" label="Asortyment" nested />
            </DesktopNavSection>

            <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase text-muted-foreground/70">
              Narzędzia
            </div>
            <DesktopNavLink to="/admin/akademia" label="Akademia" icon={GraduationCap} />
            <DesktopNavLink to="/admin/forum" label="Forum" icon={MessageCircle} />
            <DesktopNavLink to="/admin/marketing" label="Marketing" icon={Megaphone} />
            <DesktopNavLink to="/admin/regulamin" label="Regulamin" icon={Settings} />
          </nav>
          {isSupported && (
            <div className="border-t p-4">
              {isSubscribed ? (
                <button
                  type="button"
                  onClick={unsubscribe}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                  title="Wyłącz powiadomienia push"
                >
                  <BellRing size={15} />
                  Push aktywny
                </button>
              ) : permission === 'denied' ? (
                <div className="flex items-center justify-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  <BellOff size={15} />
                  Push zablokowany
                </div>
              ) : (
                <button
                  type="button"
                  onClick={subscribe}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <BellRing size={15} />
                  Włącz push
                </button>
              )}
            </div>
          )}
        </aside>
        <main className="admin-main min-w-0 flex-1 overflow-y-auto bg-background/50 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
