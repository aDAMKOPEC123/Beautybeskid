import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CalendarCheck, X } from 'lucide-react';

const HIDDEN_PATHS = ['/rezerwacja', '/auth', '/user', '/admin', '/employee'];
const DISMISSED_KEY = 'cosmo-cta-dismissed';

export const FloatingBookingCTA = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === '1');
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

  const show = visible && !isHidden && !dismissed;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden pointer-events-none md:bottom-5 md:left-auto md:right-5 md:w-[390px]">
      <div
        className={`glass-dark pointer-events-auto border-t border-oak/30 shadow-[0_-18px_45px_rgba(26,56,40,0.22)] transition-transform [transition-duration:400ms] [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] md:rounded-lg md:border ${
          show ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          onClick={() => { setDismissed(true); sessionStorage.setItem(DISMISSED_KEY, '1'); }}
          className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-ivory/60 transition-colors hover:bg-ivory/10 hover:text-ivory"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="container flex items-center justify-between gap-4 py-3 md:px-4">
          <div className="min-w-0">
            <p className="mb-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-oak">
              <CalendarCheck className="h-3.5 w-3.5" />
              Umów wizytę
            </p>
            <p className="text-sm leading-snug text-ivory/82">
              <span className="md:hidden">Bezpłatna konsultacja</span>
              <span className="hidden md:inline">Bezpłatna konsultacja dla nowych klientek</span>
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
      </div>
    </div>
  );
};
