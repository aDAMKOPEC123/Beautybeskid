import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPanelTransitionStore } from '@/store/clientPanelTransition.store';

const THEME_STYLES = {
  client: {
    shell: 'linear-gradient(135deg, rgba(248,245,239,0.92) 0%, rgba(232,243,234,0.92) 100%)',
    halo: 'radial-gradient(circle at top, rgba(196,150,90,0.32), transparent 58%)',
    card: 'rgba(26,56,40,0.84)',
    accent: '#C4965A',
    ink: '#F8F5EF',
    icon: LayoutDashboard,
    badges: ['wizyty', 'konto', 'zalecenia'],
  },
  employee: {
    shell: 'linear-gradient(135deg, rgba(232,243,234,0.95) 0%, rgba(245,249,245,0.95) 100%)',
    halo: 'radial-gradient(circle at top, rgba(61,122,84,0.24), transparent 58%)',
    card: 'rgba(26,56,40,0.86)',
    accent: '#7BB089',
    ink: '#F8F5EF',
    icon: ShieldCheck,
    badges: ['grafik', 'wizyty', 'chat'],
  },
  admin: {
    shell: 'linear-gradient(135deg, rgba(243,239,232,0.95) 0%, rgba(248,245,239,0.95) 100%)',
    halo: 'radial-gradient(circle at top, rgba(200,149,108,0.28), transparent 58%)',
    card: 'rgba(30,40,34,0.9)',
    accent: '#C8956C',
    ink: '#F8F5EF',
    icon: Sparkles,
    badges: ['zespół', 'kalendarz', 'ustawienia'],
  },
} as const;

export const ClientPanelTransitionOverlay = () => {
  const { active, label, subtitle, theme } = useClientPanelTransitionStore();
  const shouldReduce = useReducedMotion();

  if (shouldReduce) return null;

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
          <div className="absolute inset-0" style={{ background: currentTheme.shell }} />
          <div className="absolute inset-0" style={{ background: currentTheme.halo }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          />

          <div className="absolute inset-0 flex items-center justify-center px-5">
            <motion.div
              initial={{ opacity: 0, y: 36, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[420px] rounded-[28px] border border-white/20 p-6 shadow-[0_24px_90px_rgba(26,56,40,0.18)] backdrop-blur-xl"
              style={{ background: currentTheme.card }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <Icon className="h-6 w-6" style={{ color: currentTheme.accent }} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em]" style={{ color: currentTheme.accent }}>
                  Otwieramy
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em]" style={{ color: currentTheme.accent }}>
                  BeautyBeskid
                </p>
                <h2 className="mt-3 font-heading text-4xl font-bold leading-none" style={{ color: currentTheme.ink }}>
                  {label}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/74">
                  {subtitle}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {currentTheme.badges.map((badge) => (
                  <span
                    key={badge}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                      'border-white/14 text-white/78'
                    )}
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                  className="h-1 rounded-full"
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
