import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
} from 'lucide-react';

const MORE_LINKS_PRIMARY = [
  { to: '/user/lojalnosc',    label: 'Punkty',         icon: Star },
  { to: '/user/polecenia',    label: 'Polecenia',      icon: Users },
  { to: '/user/vouchery',     label: 'Vouchery',       icon: Gift },
  { to: '/user/promocje-sklepowe', label: 'Promocje',  icon: BadgePercent },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil',       label: 'Profil',         icon: UserIcon },
  { to: '/user/historia',     label: 'Historia',       icon: Clock },
  { to: '/user/dziennik',     label: 'Dziennik',       icon: BookOpen },
  { to: '/user/rutyna',       label: 'Rutyna',         icon: Sparkles },
  { to: '/user/produkty',     label: 'Produkty',       icon: ShoppingBag },
  { to: '/user/pogoda-skory', label: 'Skóra',          icon: Cloud },
  { to: '/user/zalecenia',    label: 'Beauty Plan',    icon: Flower2 },
  { to: '/',                  label: 'Wizytówka',      icon: Globe },
] as const;

const MORE_LINKS_SECONDARY = [
  { to: '/user/forum',  label: 'Forum',    icon: MessageSquare },
  { to: '/akademia',    label: 'Akademia', icon: GraduationCap },
] as const;

const ALL_MORE_LINKS = [...MORE_LINKS_PRIMARY, ...MORE_LINKS_SECONDARY] as const;

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

const backdropReducedVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 34,
      staggerChildren: 0.025,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.98,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

const panelReducedVariants = {
  hidden: { opacity: 0, y: 10 },
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
    y: 6,
    transition: { duration: 0.12, ease: 'easeIn' },
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
  const location = useLocation();
  const { getBadgeCount, moreBadge } = useUserMenuBadges();
  const shouldReduce = useReducedMotion();
  const activeBackdropVariants = shouldReduce ? backdropReducedVariants : backdropVariants;
  const activePanelVariants = shouldReduce ? panelReducedVariants : panelVariants;
  const activeItemVariants = shouldReduce ? itemReducedVariants : itemVariants;
  const navIndicatorTransition = shouldReduce
    ? { duration: 0.16, ease: 'easeOut' }
    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

  const isActive = (path: string) =>
    path === '/' || path === '/user'
      ? location.pathname === path
      : location.pathname.startsWith(path);
  const isMoreRoute = ALL_MORE_LINKS.some(({ to }) => to !== '/' && isActive(to));
  const isMoreActive = isMoreOpen || isMoreRoute;

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
              className="fixed bottom-16 left-0 right-0 z-50 max-h-[calc(100svh-5rem)] overflow-y-auto overscroll-contain rounded-t-2xl p-4 pb-6 shadow-xl lg:hidden"
              style={{ background: '#F4F9F5', borderTop: '1px solid rgba(0,0,0,0.07)' }}
              variants={activePanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="space-y-4">
                {/* Primary links */}
                <div className="grid grid-cols-3 gap-2 min-[360px]:grid-cols-4">
                  {MORE_LINKS_PRIMARY.map(({ to, label, icon: Icon }) => {
                    const count = getBadgeCount(to);
                    return (
                      <motion.div key={to} variants={activeItemVariants}>
                        <Link
                          to={to}
                          state={to === '/' ? { fromPanel: true } : undefined}
                          onClick={() => setIsMoreOpen(false)}
                          className={cn(
                            'relative isolate flex flex-col items-center gap-1 rounded-xl p-2 text-xs transition-all duration-300 active:scale-95',
                            isActive(to) ? 'font-semibold' : 'opacity-60',
                          )}
                          style={{ color: isActive(to) ? '#C4965A' : '#1A3828' }}
                        >
                          {isActive(to) && (
                            <motion.span
                              layoutId="user-mobile-more-active"
                              className="absolute inset-0 rounded-xl"
                              transition={navIndicatorTransition}
                              style={{
                                background: 'linear-gradient(135deg, rgba(196,150,90,0.16) 0%, rgba(196,150,90,0.08) 100%)',
                                boxShadow: 'inset 0 0 0 1px rgba(196,150,90,0.14)',
                              }}
                            />
                          )}
                          <Icon size={22} />
                          <span className="relative z-10 text-center leading-tight">{label}</span>
                          {count > 0 && (
                            <span
                              className="absolute right-1 top-1 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                              style={{ background: '#C4965A', color: '#fff' }}
                            >
                              {count > 9 ? '9+' : count}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Secondary links */}
                <div>
                  <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(20,40,28,0.35)' }}>
                    Odkryj
                  </p>
                  <div className="grid grid-cols-3 gap-2 min-[360px]:grid-cols-4">
                    {MORE_LINKS_SECONDARY.map(({ to, label, icon: Icon }) => (
                      <motion.div key={to} variants={activeItemVariants}>
                        <Link
                          to={to}
                          onClick={() => setIsMoreOpen(false)}
                          className="relative isolate flex flex-col items-center gap-1 rounded-xl p-2 text-xs opacity-50 transition-all duration-300 active:scale-95"
                          style={{ color: '#1A3828' }}
                        >
                          <Icon size={22} />
                          <span className="text-center leading-tight">{label}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 lg:hidden"
        style={{
          height: '64px',
          background: '#F4F9F5',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Link
          to="/user"
          className="relative isolate flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] transition-colors"
          style={{ color: isActive('/user') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isActive('/user') && !isMoreOpen && (
            <motion.span
              layoutId="user-mobile-nav-active"
              className="absolute inset-x-0 -inset-y-1 rounded-2xl"
              transition={navIndicatorTransition}
              style={{
                background: 'linear-gradient(180deg, rgba(196,150,90,0.16) 0%, rgba(196,150,90,0.08) 100%)',
              }}
            />
          )}
          <LayoutDashboard size={22} />
          <span className="relative z-10">Główna</span>
        </Link>

        <Link
          to="/user/wizyty"
          className="relative isolate flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] transition-colors"
          style={{ color: isActive('/user/wizyty') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isActive('/user/wizyty') && !isMoreOpen && (
            <motion.span
              layoutId="user-mobile-nav-active"
              className="absolute inset-x-0 -inset-y-1 rounded-2xl"
              transition={navIndicatorTransition}
              style={{
                background: 'linear-gradient(180deg, rgba(196,150,90,0.16) 0%, rgba(196,150,90,0.08) 100%)',
              }}
            />
          )}
          <Calendar size={22} />
          <span className="relative z-10">Wizyty</span>
          {getBadgeCount('/user/wizyty') > 0 && (
            <span
              className="absolute right-0.5 top-0.5 z-10 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {getBadgeCount('/user/wizyty') > 9 ? '9+' : getBadgeCount('/user/wizyty')}
            </span>
          )}
        </Link>

        <Link
          to="/rezerwacja"
          data-tour="sidebar-booking-btn"
          aria-label="Umów wizytę"
          className="flex h-12 w-12 -mt-4 items-center justify-center rounded-full shadow-md transition-transform active:scale-95"
          style={{ background: '#1A3828', color: '#fff' }}
        >
          <Plus size={24} />
        </Link>

        <Link
          to="/user/chat"
          className="relative isolate flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] transition-colors"
          style={{ color: isActive('/user/chat') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isActive('/user/chat') && !isMoreOpen && (
            <motion.span
              layoutId="user-mobile-nav-active"
              className="absolute inset-x-0 -inset-y-1 rounded-2xl"
              transition={navIndicatorTransition}
              style={{
                background: 'linear-gradient(180deg, rgba(196,150,90,0.16) 0%, rgba(196,150,90,0.08) 100%)',
              }}
            />
          )}
          <MessageCircle size={22} />
          <span className="relative z-10">Czat</span>
          {getBadgeCount('/user/chat') > 0 && (
            <span
              className="absolute right-0.5 top-0.5 z-10 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {getBadgeCount('/user/chat') > 9 ? '9+' : getBadgeCount('/user/chat')}
            </span>
          )}
        </Link>

        <button
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          className="relative isolate flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] transition-colors"
          style={{ color: isMoreActive ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isMoreActive && (
            <motion.span
              layoutId="user-mobile-nav-active"
              className="absolute inset-x-0 -inset-y-1 rounded-2xl"
              transition={navIndicatorTransition}
              style={{
                background: 'linear-gradient(180deg, rgba(196,150,90,0.16) 0%, rgba(196,150,90,0.08) 100%)',
              }}
            />
          )}
          {isMoreOpen ? <X size={22} /> : <UserIcon size={22} />}
          <span className="relative z-10">Więcej</span>
          {moreBadge > 0 && !isMoreOpen && (
            <span
              className="absolute right-0.5 top-0.5 z-10 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {moreBadge > 9 ? '9+' : moreBadge}
            </span>
          )}
        </button>
      </nav>
    </>
  );
}
