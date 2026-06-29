import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPanelTransitionStore } from '@/store/clientPanelTransition.store';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';
const MOBILE_TRANSITION_RESET_MS = 640;
const DESKTOP_TRANSITION_RESET_MS = 960;

const THEME_STYLES = {
  client: {
    shell: 'linear-gradient(135deg, rgba(248,245,239,0.92) 0%, rgba(232,243,234,0.92) 100%)',
    mobileShell: 'linear-gradient(180deg, #F6F1E7 0%, #E7EFE5 100%)',
    halo: 'radial-gradient(circle at top, rgba(196,150,90,0.32), transparent 58%)',
    card: 'rgba(26,56,40,0.84)',
    mobileCard: 'rgba(26,56,40,0.97)',
    accent: '#C4965A',
    ink: '#F8F5EF',
    icon: LayoutDashboard,
    badges: ['wizyty', 'konto', 'zalecenia'],
  },
  employee: {
    shell: 'linear-gradient(135deg, rgba(232,243,234,0.95) 0%, rgba(245,249,245,0.95) 100%)',
    mobileShell: 'linear-gradient(180deg, #EAF3EC 0%, #F4F8F4 100%)',
    halo: 'radial-gradient(circle at top, rgba(61,122,84,0.24), transparent 58%)',
    card: 'rgba(26,56,40,0.86)',
    mobileCard: 'rgba(26,56,40,0.97)',
    accent: '#7BB089',
    ink: '#F8F5EF',
    icon: ShieldCheck,
    badges: ['grafik', 'wizyty', 'chat'],
  },
  admin: {
    shell: 'linear-gradient(135deg, rgba(243,239,232,0.95) 0%, rgba(248,245,239,0.95) 100%)',
    mobileShell: 'linear-gradient(180deg, #F4EEE5 0%, #F8F4EC 100%)',
    halo: 'radial-gradient(circle at top, rgba(200,149,108,0.28), transparent 58%)',
    card: 'rgba(30,40,34,0.9)',
    mobileCard: 'rgba(30,40,34,0.97)',
    accent: '#C8956C',
    ink: '#F8F5EF',
    icon: Sparkles,
    badges: ['zespół', 'kalendarz', 'ustawienia'],
  },
} as const;

export const ClientPanelTransitionOverlay = () => {
  const { active, label, subtitle, theme, finish } = useClientPanelTransitionStore();
  const shouldReduce = useReducedMotion();
  const isMobile = window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;

  useEffect(() => {
    if (!active) return;

    const transitionReset = isMobile ? MOBILE_TRANSITION_RESET_MS : DESKTOP_TRANSITION_RESET_MS;
    const timer = window.setTimeout(() => {
      finish();
    }, transitionReset);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, finish]);

  if (shouldReduce || isMobile) return null;

  const currentTheme = THEME_STYLES[theme];
  const Icon = currentTheme.icon;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-0 z-[120] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{ background: isMobile ? currentTheme.mobileShell : currentTheme.shell }}
          />
          <div
            className="absolute inset-0 md:hidden"
            style={{ background: 'rgba(248,245,239,0.78)' }}
          />
          <div className="absolute inset-0 opacity-40 md:opacity-100" style={{ background: currentTheme.halo }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 hidden h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl md:block"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-white/18 via-white/6 to-transparent md:hidden"
          />

          <div className="absolute inset-0 flex items-end justify-center px-4 pb-5 md:items-center md:px-5 md:pb-0">
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.99 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[360px] rounded-[24px] border border-white/20 p-4 shadow-[0_18px_60px_rgba(26,56,40,0.18)] md:max-w-[420px] md:rounded-[28px] md:p-6 md:shadow-[0_24px_90px_rgba(26,56,40,0.18)] md:backdrop-blur-xl"
              style={{ background: isMobile ? currentTheme.mobileCard : currentTheme.card }}
            >
              <div className="flex items-center justify-between gap-3 md:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 md:h-14 md:w-14 md:rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: currentTheme.accent }} />
                </div>
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.24em] md:text-[10px] md:tracking-[0.26em]" style={{ color: currentTheme.accent }}>
                  Otwieramy
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.span>
                </div>
              </div>

              <div className="mt-5 md:mt-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em] md:text-[10px] md:tracking-[0.32em]" style={{ color: currentTheme.accent }}>
                  BeautyBeskid
                </p>
                <h2 className="mt-2 font-heading text-[2rem] font-bold leading-[0.92] md:mt-3 md:text-4xl md:leading-none" style={{ color: currentTheme.ink }}>
                  {label}
                </h2>
                <p className="mt-2 max-w-[16rem] text-[13px] leading-relaxed text-white/74 md:mt-3 md:max-w-none md:text-sm">
                  {subtitle}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
                {currentTheme.badges.map((badge, index) => (
                  <span
                    key={badge}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] md:px-3 md:text-[10px] md:tracking-[0.18em]',
                      index === currentTheme.badges.length - 1 && 'hidden md:inline-flex',
                      'border-white/14 text-white/78'
                    )}
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-full bg-white/10 md:mt-6">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  className="h-[3px] rounded-full md:h-1"
                  style={{ background: `linear-gradient(90deg, ${currentTheme.accent} 0%, rgba(255,255,255,0.92) 100%)` }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
