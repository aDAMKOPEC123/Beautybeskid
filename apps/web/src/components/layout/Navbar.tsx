// apps/web/src/components/layout/Navbar.tsx
import { type MouseEvent, useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { unsubscribeCurrentPushSubscription } from '@/hooks/usePushSubscription';
import { Button } from '@/components/ui/button';
import { UserRound } from 'lucide-react';
import { useClientPanelEntry } from '@/hooks/useClientPanelEntry';

const NAV_LINKS = [
  { to: '/uslugi', label: 'Usługi', num: '01' },
  { to: '/metamorfozy', label: 'Metamorfozy', num: '02' },
  { to: '/blog', label: 'Blog', num: '03' },
  { to: '/o-nas', label: 'O nas', num: '04' },
  { to: '/kontakt', label: 'Kontakt', num: '05' },
  { to: '/program-lojalnosciowy', label: 'Lojalność', num: '06' },
];

const PanelLink = ({
  dest,
  label,
  mobile = false,
  onClick,
}: {
  dest: string;
  label: string;
  mobile?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) => (
  <Link
    to={dest}
    onClick={onClick}
    className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-oak/45 text-oak transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak ${
      mobile ? 'w-full justify-start px-4 text-[15px]' : 'px-4 text-[13px]'
    }`}
  >
    <UserRound className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
    <span className="whitespace-nowrap font-semibold">{label}</span>
  </Link>
);

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const openClientPanel = useClientPanelEntry();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();

  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const isMobileRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    isMobileRef.current = mq.matches; // set real initial value safely inside effect
    const handler = (e: MediaQueryListEvent) => {
      isMobileRef.current = e.matches;
      if (e.matches) setHidden(false); // restore navbar when entering mobile breakpoint
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setHidden(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (!isMobileRef.current) {
        // Hysteresis: require 10px upward movement to re-show, prevents flicker at boundary
        if (y > 100 && y > lastScrollY.current) {
          setHidden(true);
        } else if (y < lastScrollY.current - 10) {
          setHidden(false);
        }
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const menu = mobileMenuRef.current;
    if (!menu) return;
    if (mobileOpen) menu.removeAttribute('inert');
    else menu.setAttribute('inert', '');
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeMenuButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        mobileMenuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      ).filter((element) => element.tabIndex !== -1);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    const results = await Promise.allSettled([
      authApi.logout(),
      unsubscribeCurrentPushSubscription(),
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') console.error(result.reason);
    });
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  // isAdmin checked before isEmployee because useAuth sets isEmployee=true for ADMIN role too
  const appLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
  const appDest = isAuthenticated ? appLink : '/auth/login';

  // Jedna etykieta zamiast dwóch konkurujących linii. Dla niezalogowanego
  // "Panel klienta" było żargonem — nie ma jeszcze żadnego panelu.
  const accountLabel = isAdmin
    ? 'Panel admina'
    : isEmployee
      ? 'Panel pracownika'
      : isAuthenticated
        ? 'Moje konto'
        : 'Zaloguj się';

  const handlePanelEntry = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, closeMenu?: () => void) => {
    event.preventDefault();
    openClientPanel({ closeMenu });
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'linear-gradient(135deg, #1A3828 0%, #243f30 100%)',
          borderBottom: '2px solid #C4965A',
          boxShadow: '0 2px 16px rgba(26,56,40,0.18)',
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.3s ease',
          willChange: 'transform',
        }}
      >
        <div style={{ height: 'env(safe-area-inset-top)', background: 'inherit' }} />
        <div className="container flex items-center justify-between" style={{ height: '72px' }}>
          {/* Logo */}
          <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2.5">
            <img src="/logo-64.webp" alt="BeskidStudio" width="32" height="32" className="h-8 w-8" />
            <span className="hidden font-display text-[13px] uppercase tracking-[0.08em] md:inline" style={{ color: '#F8F5F0', fontStyle: 'normal', fontWeight: 300 }}>BeskidStudio</span>
          </Link>

          {/* Mobile center: konto */}
          <div className="flex min-w-0 flex-1 justify-center px-2 md:hidden">
            <button
              type="button"
              onClick={(event) => handlePanelEntry(event)}
              className="flex h-11 max-w-full items-center gap-2 rounded-full border border-oak/45 bg-white/10 px-4 text-oak backdrop-blur transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oak"
            >
              <UserRound className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
              <span className="whitespace-nowrap text-[13px] font-semibold">{accountLabel}</span>
            </button>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-caramel${isActive ? ' border-b border-caramel pb-px' : ''}`
                }
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost-underline" size="sm" asChild data-tour="navbar-booking-btn">
                  <Link to="/rezerwacja">Rezerwacja</Link>
                </Button>
                <PanelLink dest={appDest} label={accountLabel} onClick={(event) => handlePanelEntry(event)} />
                <button
                  onClick={handleLogout}
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <>
                <PanelLink dest={appDest} label={accountLabel} onClick={(event) => handlePanelEntry(event)} />
                <Button variant="ghost-underline" size="sm" asChild>
                  <Link to="/rezerwacja">Rezerwacja</Link>
                </Button>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            ref={menuButtonRef}
            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            <span
              className="block h-px w-[22px] transition-all duration-300"
              style={{ background: '#F8F5F0' }}
            />
            <span
              className="block h-px w-[14px] transition-all duration-300"
              style={{ background: '#F8F5F0' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      <div
        ref={mobileMenuRef}
        id="mobile-navigation"
        className={`fixed inset-0 z-[60] flex flex-col transition-[clip-path] [transition-duration:400ms] [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] ${
          mobileOpen ? '[clip-path:inset(0_0_0%_0)]' : '[clip-path:inset(0_0_100%_0)]'
        } ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
        style={{ background: '#1A3828', paddingTop: 'env(safe-area-inset-top)' }}
      >
            {/* Header row */}
            <div className="container flex items-center justify-between" style={{ height: '72px' }}>
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2.5">
                <img src="/logo-64.webp" alt="BeskidStudio" width="32" height="32" className="h-8 w-8" />
                <span className="font-display text-[13px] uppercase tracking-[0.08em] text-ivory" style={{ fontStyle: 'normal', fontWeight: 300 }}>BeskidStudio</span>
              </Link>
              <button
                ref={closeMenuButtonRef}
                onClick={() => setMobileOpen(false)}
                className="text-ivory text-2xl leading-none p-2"
                aria-label="Zamknij menu"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <div className="container flex-1 flex flex-col justify-center gap-1">
              {NAV_LINKS.map(({ to, label, num }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-baseline gap-4 py-3 border-b border-ivory/10 group"
                >
                  <span className="eyebrow text-caramel">{num}</span>
                  <span
                    className="font-display text-[28px] text-ivory transition-colors group-hover:text-caramel"
                    style={{ fontStyle: 'italic', fontWeight: 300 }}
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Bottom area */}
            <div className="container pb-8 flex flex-col gap-3 border-t border-ivory/10 pt-6">
              {isAuthenticated ? (
                <>
                  <PanelLink
                    dest={appDest}
                    label={accountLabel}
                    mobile
                    onClick={(event) => handlePanelEntry(event, () => setMobileOpen(false))}
                  />
                  <button
                    onClick={handleLogout}
                    className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors text-left py-2"
                  >
                    Wyloguj
                  </button>
                </>
              ) : (
                <PanelLink
                  dest={appDest}
                  label={accountLabel}
                  mobile
                  onClick={(event) => handlePanelEntry(event, () => setMobileOpen(false))}
                />
              )}
              <Link
                to="/rezerwacja"
                onClick={() => setMobileOpen(false)}
                className="mt-2 py-4 text-center text-[10px] tracking-[0.3em] uppercase font-medium bg-caramel text-espresso hover:bg-caramel/90 transition-colors"
              >
                Zarezerwuj wizytę
              </Link>
            </div>
      </div>
    </>
  );
};
