import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUserMenuBadges } from '@/hooks/useUserMenuBadges';
import {
  Globe,
  LayoutDashboard,
  Calendar,
  Plus,
  MessageCircle,
  X,
  Bell,
  User as UserIcon,
  Star,
  BookOpen,
  ShoppingBag,
  Users,
  Sparkles,
  GraduationCap,
  Cloud,
  Clock,
  Gift,
  Flower2,
  MessageSquare,
  BadgePercent,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type MobileNavEnvironment = 'browser' | 'android-pwa' | 'ios-pwa';

type BottomNavIconProps = {
  icon: LucideIcon;
  active: boolean;
  environment: MobileNavEnvironment;
  size: number;
  badge?: number;
  transition: Transition;
};

const BottomNavIcon = ({
  icon: Icon,
  active,
  environment,
  size,
  badge,
  transition,
}: BottomNavIconProps) => {
  const showIndicator = active && environment !== 'ios-pwa';
  const wrapperClassName = environment === 'android-pwa'
    ? 'h-8 w-14'
    : environment === 'ios-pwa'
      ? 'h-7 w-10'
      : 'h-8 w-12';

  return (
    <span className={cn('relative z-10 flex shrink-0 items-center justify-center', wrapperClassName)}>
      {showIndicator && (
        <motion.span
          layoutId="user-mobile-nav-active"
          className="absolute inset-0 rounded-full"
          transition={transition}
          style={{
            background: environment === 'android-pwa'
              ? 'rgba(196,150,90,0.20)'
              : 'rgba(196,150,90,0.12)',
          }}
        />
      )}
      <Icon
        size={size}
        strokeWidth={active ? 2.35 : 1.9}
        className="relative z-10"
      />
      {badge != null && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{ background: '#C4965A', color: '#fff' }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
  );
};

export type MobileBottomNavMetrics = {
  environment: MobileNavEnvironment;
  contentHeight: number;
  totalHeight: string;
};

export const getMobileBottomNavMetrics = (): MobileBottomNavMetrics => {
  if (typeof window === 'undefined') {
    return {
      environment: 'browser',
      contentHeight: 64,
      totalHeight: 'calc(64px + env(safe-area-inset-bottom))',
    };
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const userAgent = navigatorWithStandalone.userAgent;
  const isStandalone = navigatorWithStandalone.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigatorWithStandalone.platform === 'MacIntel' && navigatorWithStandalone.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  const environment: MobileNavEnvironment = isStandalone && isIOS
    ? 'ios-pwa'
    : isStandalone && isAndroid
      ? 'android-pwa'
      : 'browser';
  const contentHeight = environment === 'ios-pwa' ? 44 : environment === 'android-pwa' ? 56 : 64;

  return {
    environment,
    contentHeight,
    totalHeight: `calc(${contentHeight}px + env(safe-area-inset-bottom))`,
  };
};

type MobileMoreLink = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type MobileMoreGroup = {
  label: string;
  links: readonly MobileMoreLink[];
};

const MORE_LINK_GROUPS: readonly MobileMoreGroup[] = [
  {
    label: 'Konto i kontakt',
    links: [
      { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
      { to: '/user/profil', label: 'Ustawienia konta', icon: UserIcon },
    ],
  },
  {
    label: 'Moja pielęgnacja',
    links: [
      { to: '/user/zalecenia', label: 'Beauty Plan', icon: Flower2 },
      { to: '/user/rutyna', label: 'Rutyna domowa', icon: Sparkles },
      { to: '/user/dziennik', label: 'Dziennik skóry', icon: BookOpen },
      { to: '/user/pogoda-skory', label: 'Profil skóry', icon: Cloud },
      { to: '/user/produkty', label: 'Moje produkty', icon: ShoppingBag },
      { to: '/user/historia', label: 'Historia zabiegów', icon: Clock },
    ],
  },
  {
    label: 'Korzyści',
    links: [
      { to: '/user/lojalnosc', label: 'Punkty i nagrody', icon: Star },
      { to: '/user/vouchery', label: 'Vouchery', icon: Gift },
      { to: '/user/polecenia', label: 'Program poleceń', icon: Users },
      { to: '/user/promocje-sklepowe', label: 'Promocje sklepowe', icon: BadgePercent },
    ],
  },
  {
    label: 'Społeczność i wiedza',
    links: [
      { to: '/user/forum', label: 'Forum klientek', icon: MessageSquare },
      { to: '/akademia', label: 'Akademia', icon: GraduationCap },
      { to: '/', label: 'Strona główna', icon: Globe },
    ],
  },
] as const;

const ALL_MORE_LINKS = MORE_LINK_GROUPS.reduce<MobileMoreLink[]>(
  (links, group) => [...links, ...group.links],
  [],
);

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

const backdropReducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const panelVariants = {
  hidden: { opacity: 0.96, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 30,
      mass: 0.82,
      staggerChildren: 0.025,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0.96,
    y: '100%',
    transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] as const },
  },
};

const panelReducedVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: 'easeOut',
      staggerChildren: 0.018,
    },
  },
  exit: {
    opacity: 0,
    y: 24,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
};

const itemReducedVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' } },
};

export function MobileBottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const morePanelDragControls = useDragControls();
  const location = useLocation();
  const { getBadgeCount, moreBadge } = useUserMenuBadges();
  const shouldReduce = useReducedMotion();
  const navMetrics = getMobileBottomNavMetrics();
  const isIOSPwa = navMetrics.environment === 'ios-pwa';
  const bottomNavItemClassName = cn(
    'relative isolate flex h-full w-full max-w-16 justify-self-center flex-col items-center justify-center transition-colors',
    isIOSPwa ? 'translate-y-1.5 gap-0 px-2 py-0 text-[10px]' : 'gap-0.5 px-3 py-1 text-[11px]',
  );
  const bottomNavIconSize = isIOSPwa ? 25 : 24;
  const activeBackdropVariants = shouldReduce ? backdropReducedVariants : backdropVariants;
  const activePanelVariants = shouldReduce ? panelReducedVariants : panelVariants;
  const activeItemVariants = shouldReduce ? itemReducedVariants : itemVariants;
  const navIndicatorTransition: Transition = shouldReduce
    ? { duration: 0.16, ease: 'easeOut' }
    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

  const isActive = (path: string) =>
    path === '/' || path === '/user'
      ? location.pathname === path
      : location.pathname.startsWith(path);
  const isMoreRoute = ALL_MORE_LINKS.some(({ to }) => to !== '/' && isActive(to));
  const isMoreActive = isMoreOpen || isMoreRoute;
  const dashboardActive = isActive('/user') && !isMoreOpen;
  const appointmentsActive = isActive('/user/wizyty') && !isMoreOpen;
  const chatActive = isActive('/user/chat') && !isMoreOpen;

  const handleMorePanelDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.offset.y > 90 || info.velocity.y > 650;
    if (shouldClose) setIsMoreOpen(false);
  };

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMoreOpen]);

  return (
    <>
      <AnimatePresence initial={false}>
        {isMoreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
              onClick={() => setIsMoreOpen(false)}
              variants={activeBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            <motion.div
              className={cn(
                'fixed left-0 right-0 z-50 overflow-y-auto overscroll-contain rounded-t-2xl shadow-xl lg:hidden',
                isIOSPwa ? 'p-3 pb-4' : 'p-4 pb-6',
              )}
              style={{
                maxHeight: `calc(100svh - ${navMetrics.contentHeight + 12}px - env(safe-area-inset-bottom))`,
                background: '#F4F9F5',
                borderTop: '1px solid rgba(0,0,0,0.07)',
                bottom: navMetrics.totalHeight,
                willChange: 'transform, opacity',
              }}
              data-nav-environment={navMetrics.environment}
              variants={activePanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag="y"
              dragListener={false}
              dragControls={morePanelDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.02, bottom: 0.28 }}
              dragMomentum={false}
              onDragEnd={handleMorePanelDragEnd}
            >
              <div className={isIOSPwa ? 'space-y-3' : 'space-y-4'}>
                <div
                  className="-mx-1 -mt-1 flex cursor-grab touch-none flex-col px-1 pb-1 active:cursor-grabbing"
                  onPointerDown={(event) => morePanelDragControls.start(event)}
                >
                  <div
                    className="mx-auto mb-3 h-1 w-10 rounded-full"
                    style={{ background: 'rgba(26,56,40,0.2)' }}
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-heading font-bold leading-tight" style={{ color: '#1A3828' }}>
                        Więcej
                      </h2>
                      <p className="mt-0.5 text-xs" style={{ color: 'rgba(20,40,28,0.52)' }}>
                        Wszystkie funkcje panelu klienta
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMoreOpen(false)}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white"
                      style={{ borderColor: 'rgba(26,56,40,0.12)', color: '#1A3828' }}
                      aria-label="Zamknij menu"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {MORE_LINK_GROUPS.map((group) => (
                  <section key={group.label} aria-labelledby={`mobile-more-${group.label.replace(/ /g, '-').toLowerCase()}`}>
                    <h3
                      id={`mobile-more-${group.label.replace(/ /g, '-').toLowerCase()}`}
                      className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'rgba(20,40,28,0.48)' }}
                    >
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-2">
                      {group.links.map(({ to, label, icon: Icon }) => {
                        const count = getBadgeCount(to);
                        const active = to !== '/' && isActive(to);

                        return (
                          <motion.div key={to} variants={activeItemVariants}>
                            <Link
                              to={to}
                              state={to === '/' ? { fromPanel: true } : undefined}
                              onClick={() => setIsMoreOpen(false)}
                              className="relative isolate flex min-h-12 items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-sm transition-all active:scale-[0.98]"
                              style={{
                                borderColor: active ? 'rgba(196,150,90,0.38)' : 'rgba(26,56,40,0.09)',
                                color: active ? '#9A6C32' : '#1A3828',
                                boxShadow: active ? '0 4px 14px rgba(196,150,90,0.10)' : 'none',
                              }}
                            >
                              {active && !isIOSPwa && (
                                <motion.span
                                  layoutId="user-mobile-more-active"
                                  className="absolute inset-0 rounded-xl"
                                  transition={navIndicatorTransition}
                                  style={{ background: 'rgba(196,150,90,0.08)' }}
                                />
                              )}
                              <span
                                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: active ? 'rgba(196,150,90,0.15)' : 'rgba(26,56,40,0.06)' }}
                              >
                                <Icon size={18} strokeWidth={active ? 2.3 : 1.9} />
                              </span>
                              <span className={cn('relative z-10 min-w-0 flex-1 leading-tight', active && 'font-semibold')}>
                                {label}
                              </span>
                              {count > 0 ? (
                                <span
                                  className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                                  style={{ background: '#C4965A', color: '#fff' }}
                                >
                                  {count > 9 ? '9+' : count}
                                </span>
                              ) : (
                                <ChevronRight size={15} className="relative z-10 shrink-0 opacity-30" />
                              )}
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 items-center px-2 lg:hidden"
        style={{
          height: navMetrics.totalHeight,
          background: isIOSPwa ? 'rgba(244,249,245,0.92)' : '#F4F9F5',
          borderTop: isIOSPwa ? '1px solid rgba(26,56,40,0.08)' : '1px solid rgba(0,0,0,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxSizing: 'border-box',
          backdropFilter: isIOSPwa ? 'blur(18px) saturate(1.2)' : undefined,
          WebkitBackdropFilter: isIOSPwa ? 'blur(18px) saturate(1.2)' : undefined,
        }}
        data-nav-environment={navMetrics.environment}
      >
        <Link
          to="/user"
          className={cn(bottomNavItemClassName, dashboardActive && 'font-semibold')}
          style={{ color: dashboardActive ? '#9A6C32' : 'rgba(26,56,40,0.54)' }}
        >
          <BottomNavIcon
            icon={LayoutDashboard}
            active={dashboardActive}
            environment={navMetrics.environment}
            size={bottomNavIconSize}
            transition={navIndicatorTransition}
          />
          <span className="relative z-10 leading-none">Główna</span>
        </Link>

        <Link
          to="/user/wizyty"
          className={cn(bottomNavItemClassName, appointmentsActive && 'font-semibold')}
          style={{ color: appointmentsActive ? '#9A6C32' : 'rgba(26,56,40,0.54)' }}
        >
          <BottomNavIcon
            icon={Calendar}
            active={appointmentsActive}
            environment={navMetrics.environment}
            size={bottomNavIconSize}
            badge={getBadgeCount('/user/wizyty')}
            transition={navIndicatorTransition}
          />
          <span className="relative z-10 leading-none">Wizyty</span>
        </Link>

        <Link
          to="/rezerwacja"
          data-tour="sidebar-booking-btn"
          aria-label="Umów wizytę"
          className={cn(
            'flex items-center justify-center justify-self-center rounded-full shadow-md transition-transform active:scale-95',
            isIOSPwa ? '-mt-1 h-11 w-11 translate-y-1.5' : '-mt-4 h-12 w-12',
          )}
          style={{ background: '#1A3828', color: '#fff' }}
        >
          <Plus size={24} strokeWidth={2.2} />
        </Link>

        <Link
          to="/user/chat"
          className={cn(bottomNavItemClassName, chatActive && 'font-semibold')}
          style={{ color: chatActive ? '#9A6C32' : 'rgba(26,56,40,0.54)' }}
        >
          <BottomNavIcon
            icon={MessageCircle}
            active={chatActive}
            environment={navMetrics.environment}
            size={bottomNavIconSize}
            badge={getBadgeCount('/user/chat')}
            transition={navIndicatorTransition}
          />
          <span className="relative z-10 leading-none">Czat</span>
        </Link>

        <button
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          className={cn(bottomNavItemClassName, isMoreActive && 'font-semibold')}
          style={{ color: isMoreActive ? '#9A6C32' : 'rgba(26,56,40,0.54)' }}
        >
          <BottomNavIcon
            icon={isMoreOpen ? X : UserIcon}
            active={isMoreActive}
            environment={navMetrics.environment}
            size={bottomNavIconSize}
            badge={!isMoreOpen ? moreBadge : undefined}
            transition={navIndicatorTransition}
          />
          <span className="relative z-10 leading-none">Więcej</span>
        </button>
      </nav>
    </>
  );
}
