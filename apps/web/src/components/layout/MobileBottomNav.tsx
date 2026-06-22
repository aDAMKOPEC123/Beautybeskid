import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUserMenuBadges } from '@/hooks/useUserMenuBadges';
import {
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
} from 'lucide-react';

const MORE_LINKS = [
  { to: '/user/lojalnosc', label: 'Punkty', icon: Star },
  { to: '/user/historia', label: 'Historia', icon: Clock },
  { to: '/user/dziennik', label: 'Dziennik', icon: BookOpen },
  { to: '/user/rutyna', label: 'Rutyna', icon: Sparkles },
  { to: '/user/produkty', label: 'Produkty', icon: ShoppingBag },
  { to: '/user/polecenia', label: 'Polecenia', icon: Users },
  { to: '/user/pogoda-skory', label: 'Skora', icon: Cloud },
  { to: '/akademia', label: 'Akademia', icon: GraduationCap },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil', label: 'Profil', icon: UserIcon },
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
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

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
};

export function MobileBottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const { getBadgeCount, moreBadge } = useUserMenuBadges();
  const shouldReduce = useReducedMotion();
  const activeBackdropVariants = shouldReduce ? {} : backdropVariants;
  const activePanelVariants = shouldReduce ? {} : panelVariants;
  const activeItemVariants = shouldReduce ? {} : itemVariants;

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

  return (
    <>
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setIsMoreOpen(false)}
              variants={activeBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />

            <motion.div
              className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl p-4 shadow-xl md:hidden"
              style={{ background: '#F4F9F5', borderTop: '1px solid rgba(0,0,0,0.07)' }}
              variants={activePanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="grid grid-cols-4 gap-2">
                {MORE_LINKS.map(({ to, label, icon: Icon }) => {
                  const count = getBadgeCount(to);

                  return (
                    <motion.div key={to} variants={activeItemVariants}>
                      <Link
                        to={to}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          'relative flex flex-col items-center gap-1 rounded-xl p-2 text-xs transition-colors active:scale-95',
                          isActive(to) ? 'font-semibold' : 'opacity-60',
                        )}
                        style={{ color: isActive(to) ? '#C4965A' : '#1A3828' }}
                      >
                        <Icon size={22} />
                        <span className="text-center leading-tight">{label}</span>
                        {count > 0 && (
                          <span
                            className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 md:hidden"
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
          <span>Glowna</span>
        </Link>

        <Link
          to="/user/wizyty"
          className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isActive('/user/wizyty') && !isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          <Calendar size={22} />
          <span>Wizyty</span>
          {getBadgeCount('/user/wizyty') > 0 && (
            <span
              className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {getBadgeCount('/user/wizyty') > 9 ? '9+' : getBadgeCount('/user/wizyty')}
            </span>
          )}
        </Link>

        <Link
          to="/rezerwacja"
          className="flex h-12 w-12 -mt-4 items-center justify-center rounded-full shadow-md transition-transform active:scale-95"
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
          {getBadgeCount('/user/chat') > 0 && (
            <span
              className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
              style={{ background: '#C4965A', color: '#fff' }}
            >
              {getBadgeCount('/user/chat') > 9 ? '9+' : getBadgeCount('/user/chat')}
            </span>
          )}
        </Link>

        <button
          onClick={() => setIsMoreOpen((open) => !open)}
          className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors"
          style={{ color: isMoreOpen ? '#C4965A' : 'rgba(26,56,40,0.5)' }}
        >
          {isMoreOpen ? <X size={22} /> : <UserIcon size={22} />}
          <span>Wiecej</span>
          {moreBadge > 0 && !isMoreOpen && (
            <span
              className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold"
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
