import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarCheck } from 'lucide-react';

const HIDDEN_PATHS = ['/rezerwacja', '/auth', '/user', '/admin', '/employee'];

export const FloatingBookingCTA = () => {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  const isHidden = HIDDEN_PATHS.some((path) => location.pathname.startsWith(path));
  const isHome = location.pathname === '/';

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = isHome && isMobile ? 180 : 260;
      setVisible(window.scrollY > threshold);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome, isMobile]);

  return (
    <AnimatePresence>
      {visible && !isHidden && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          className="glass-dark fixed bottom-0 left-0 right-0 z-40 border-t border-oak/30 shadow-[0_-18px_45px_rgba(26,56,40,0.22)] md:bottom-5 md:left-auto md:right-5 md:w-[390px] md:rounded-lg md:border"
        >
          <div className="container flex items-center justify-between gap-4 py-3 md:px-4">
            <div className="min-w-0">
              <p className="mb-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-oak">
                <CalendarCheck className="h-3.5 w-3.5" />
                Umów wizytę
              </p>
              <p className="truncate text-sm text-ivory/82">
                Bezpłatna konsultacja dla nowych klientek
              </p>
            </div>
            <Link
              to="/rezerwacja"
              className="premium-shine flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-oak px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-espresso transition-colors hover:bg-oak/90"
            >
              Rezerwuj
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
