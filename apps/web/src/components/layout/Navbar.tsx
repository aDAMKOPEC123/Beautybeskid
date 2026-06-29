// apps/web/src/components/layout/Navbar.tsx
import { type MouseEvent, useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, LayoutDashboard } from 'lucide-react';
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
  line1,
  line2,
  mobile = false,
  onClick,
}: {
  dest: string;
  line1: string;
  line2: string;
  mobile?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) => (
  <Link
    to={dest}
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: mobile ? 'flex-start' : 'flex-end',
      gap: '2px',
      textDecoration: 'none',
    }}
  >
    <span
      style={{
        color: '#C8956C',
        fontSize: mobile ? '12px' : '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        borderBottom: '1px solid #C8956C',
        paddingBottom: '1px',
      }}
    >
      {line1}
    </span>
    <span
      style={{
        color: mobile ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.45)',
        fontSize: mobile ? '9px' : '8px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {line2}
    </span>
  </Link>
);

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const openClientPanel = useClientPanelEntry();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
    setMobileOpen(false);
  };

  // isAdmin checked before isEmployee because useAuth sets isEmployee=true for ADMIN role too
  const appLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
  const appLine1 = isAdmin ? 'Panel admina →' : isEmployee ? 'Panel pracownika →' : 'Panel klienta →';
  const appLine2 = isAdmin ? 'panel administracyjny' : isEmployee ? 'panel pracownika' : (isAuthenticated ? 'moje konto' : 'zaloguj lub zarejestruj się');
  const appDest = isAuthenticated ? appLink : '/auth/login';
  const mobilePanelTitle = isAdmin ? 'Panel admina' : isEmployee ? 'Panel pracownika' : 'Panel klienta';
  const mobilePanelHint = isAdmin
    ? 'ustawienia i grafik'
    : isEmployee
      ? 'grafik i wizyty'
      : isAuthenticated
        ? 'moje konto'
        : 'otworz konto';

  const handlePanelEntry = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>, closeMenu?: () => void) => {
    event.preventDefault();
    openClientPanel({ closeMenu });
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '72px',
          background: 'linear-gradient(135deg, #1A3828 0%, #243f30 100%)',
          borderBottom: '2px solid #C4965A',
          boxShadow: '0 2px 16px rgba(26,56,40,0.18)',
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.3s ease',
          willChange: 'transform',
        }}
      >
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="BeskidStudio" className="h-8 w-auto" />
            <span className="font-display text-[13px] uppercase tracking-[0.08em]" style={{ color: '#F8F5F0', fontStyle: 'normal', fontWeight: 300 }}>BeskidStudio</span>
          </Link>

          {/* Mobile center: Panel klienta */}
          <div className="md:hidden flex-1 flex justify-center px-2">
            <button
              type="button"
              onClick={(event) => handlePanelEntry(event)}
              className="group flex min-w-0 max-w-[184px] items-center gap-2.5 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 shadow-[0_10px_24px_rgba(14,32,24,0.16)] backdrop-blur"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-caramel/18 text-caramel">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-left leading-none">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-caramel">
                  {mobilePanelTitle}
                </span>
                <span className="mt-1 block truncate text-[9px] text-ivory/72">
                  {mobilePanelHint}
                </span>
              </span>
              <span aria-hidden="true" className="text-caramel">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
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
                <PanelLink dest={appDest} line1={appLine1} line2={appLine2} onClick={(event) => handlePanelEntry(event)} />
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
                <PanelLink dest={appDest} line1={appLine1} line2={appLine2} onClick={(event) => handlePanelEntry(event)} />
                <Button variant="ghost-underline" size="sm" asChild>
                  <Link to="/rezerwacja">Rezerwacja</Link>
                </Button>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
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
        className={`fixed inset-0 z-50 flex flex-col transition-[clip-path] duration-[400ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          mobileOpen ? '[clip-path:inset(0_0_0%_0)]' : '[clip-path:inset(0_0_100%_0)]'
        } ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
        style={{ background: '#1A3828' }}
      >
            {/* Header row */}
            <div className="container flex items-center justify-between" style={{ height: '72px' }}>
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <img src="/logo.png" alt="BeskidStudio" className="h-8 w-auto" />
                <span className="font-display text-[13px] uppercase tracking-[0.08em] text-ivory" style={{ fontStyle: 'normal', fontWeight: 300 }}>BeskidStudio</span>
              </Link>
              <button
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
                    line1={appLine1}
                    line2={appLine2}
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
                  line1={appLine1}
                  line2={appLine2}
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
