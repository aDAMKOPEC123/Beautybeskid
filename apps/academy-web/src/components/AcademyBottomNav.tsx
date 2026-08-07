import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award, BookOpen, ExternalLink, GraduationCap, LayoutGrid, Lock, LogIn, MapPin,
  MessageCircleHeart, ShoppingCart, Sparkles, UserPlus, UserRound, X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/store/cart.store';

/**
 * Dolna nawigacja kursantki. Akademia to aplikacja, w której krąży się między
 * katalogiem, bieżącą lekcją, Atlasem i quizami — hamburger kosztował dwa
 * dotknięcia przy każdym przejściu. Cztery stałe zakładki plus katalog na
 * środku; reszta wchodzi do panelu „Więcej”, który zastępuje menu z paska.
 *
 * Wysokości dobierane do środowiska, tak jak w panelu klientki salonu:
 * zainstalowana apka na iOS ma własny pasek gestu, więc potrzebuje mniej.
 */

type NavEnvironment = 'browser' | 'android-pwa' | 'ios-pwa';

export type BottomNavMetrics = {
  environment: NavEnvironment;
  contentHeight: number;
  totalHeight: string;
};

export function getBottomNavMetrics(): BottomNavMetrics {
  if (typeof window === 'undefined') {
    return { environment: 'browser', contentHeight: 64, totalHeight: 'calc(64px + env(safe-area-inset-bottom))' };
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const environment: NavEnvironment = standalone && isIOS ? 'ios-pwa' : standalone && /Android/i.test(nav.userAgent) ? 'android-pwa' : 'browser';
  const contentHeight = environment === 'ios-pwa' ? 48 : environment === 'android-pwa' ? 56 : 62;
  return { environment, contentHeight, totalHeight: `calc(${contentHeight}px + env(safe-area-inset-bottom))` };
}

type MoreLink = { to: string; label: string; icon: LucideIcon; locked?: boolean; external?: boolean };
type MoreGroup = { label: string; links: MoreLink[] };

export function AcademyBottomNav() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const cartCount = useCartStore((state) => state.items.length);
  const metrics = getBottomNavMetrics();

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [moreOpen]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const active = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to);

  const moreGroups: MoreGroup[] = [
    {
      label: 'Nauka',
      links: [
        { to: '/quizy', label: 'Quizy', icon: Sparkles, locked: !isAuthenticated },
        { to: '/certyfikaty', label: 'Certyfikaty', icon: Award, locked: !isAuthenticated },
        { to: '/zapytaj-kosmetologa', label: 'Zapytaj kosmetologa', icon: MessageCircleHeart, locked: !isAuthenticated },
      ],
    },
    {
      label: 'Konto',
      links: [
        { to: '/koszyk', label: cartCount > 0 ? `Koszyk (${cartCount})` : 'Koszyk', icon: ShoppingCart },
        ...(isAuthenticated
          ? [{ to: '/profil', label: 'Mój profil', icon: UserRound }]
          : [
            { to: '/logowanie', label: 'Zaloguj się', icon: LogIn },
            { to: '/rejestracja', label: 'Załóż darmowe konto', icon: UserPlus },
          ]),
        ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: 'Panel administratora', icon: LayoutGrid }] : []),
      ],
    },
  ];

  const moreActive = moreOpen || moreGroups.some((group) => group.links.some((link) => active(link.to)));

  const tab = (to: string, label: string, Icon: LucideIcon, opts: { exact?: boolean; locked?: boolean } = {}) => {
    const isOn = active(to, opts.exact) && !moreOpen;
    return (
      <Link
        to={opts.locked ? '/logowanie' : to}
        state={opts.locked ? { from: to } : undefined}
        className={`academy-bnav-tab${isOn ? ' is-active' : ''}`}
        aria-current={isOn ? 'page' : undefined}
        aria-label={opts.locked ? `${label} — zaloguj się, aby uzyskać dostęp` : label}
      >
        <span className="academy-bnav-icon"><Icon aria-hidden />{opts.locked && <Lock className="academy-bnav-lock" aria-hidden />}</span>
        <span className="academy-bnav-label">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {moreOpen && (
        <div className="academy-bnav-backdrop" onClick={() => setMoreOpen(false)} aria-hidden />
      )}

      <div
        id="academy-more-panel"
        className={`academy-bnav-sheet${moreOpen ? ' is-open' : ''}`}
        style={{ bottom: metrics.totalHeight, maxHeight: `calc(100svh - ${metrics.contentHeight + 24}px - env(safe-area-inset-bottom))` }}
        role="dialog"
        aria-modal="true"
        aria-label="Więcej"
        aria-hidden={!moreOpen}
        {...(!moreOpen ? { inert: '' } : {})}
      >
        <div className="academy-bnav-sheet-head">
          <span className="academy-bnav-grip" aria-hidden />
          <div>
            <h2>Więcej</h2>
            <p>Pozostałe miejsca w Akademii</p>
          </div>
          <button type="button" onClick={() => setMoreOpen(false)} aria-label="Zamknij menu"><X aria-hidden /></button>
        </div>

        {moreGroups.map((group) => (
          <section key={group.label}>
            <h3>{group.label}</h3>
            <div>
              {group.links.map(({ to, label, icon: Icon, locked }) => (
                <Link
                  key={to}
                  to={locked ? '/logowanie' : to}
                  state={locked ? { from: to } : undefined}
                  className={active(to) ? 'is-active' : ''}
                  aria-label={locked ? `${label} — zaloguj się, aby uzyskać dostęp` : undefined}
                >
                  <span><Icon aria-hidden /></span>
                  {label}
                  {locked && <Lock className="academy-bnav-lock" aria-hidden />}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <a className="academy-bnav-salon" href="https://kosmetologwiktoriacwik.pl">
          <ExternalLink aria-hidden />Strona salonu
        </a>
      </div>

      <nav
        className="academy-bnav"
        style={{ height: metrics.totalHeight }}
        data-nav-environment={metrics.environment}
        aria-label="Nawigacja główna"
      >
        {tab('/', 'Odkrywaj', LayoutGrid, { exact: true })}
        {tab('/moje-kursy', 'Moja nauka', BookOpen, { locked: !isAuthenticated })}

        <Link to="/kursy" className={`academy-bnav-fab${active('/kursy') ? ' is-active' : ''}`} aria-label="Katalog kursów">
          <GraduationCap aria-hidden />
        </Link>

        {tab('/atlas', 'Atlas', MapPin, { locked: !isAuthenticated })}

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={`academy-bnav-tab${moreActive ? ' is-active' : ''}`}
          aria-expanded={moreOpen}
          aria-controls="academy-more-panel"
        >
          <span className="academy-bnav-icon">
            {moreOpen ? <X aria-hidden /> : <UserRound aria-hidden />}
            {!moreOpen && cartCount > 0 && <span className="academy-bnav-badge">{cartCount > 9 ? '9+' : cartCount}</span>}
          </span>
          <span className="academy-bnav-label">Więcej</span>
        </button>
      </nav>
    </>
  );
}
