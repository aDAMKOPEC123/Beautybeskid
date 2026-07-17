import { Outlet, Link, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, LayoutGrid, Sparkles, Menu, X, MessageCircleHeart, LogIn, UserRound, ExternalLink, Settings2, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trackAcademyEvent } from '@/lib/academyAnalytics';
import { useCartStore } from '@/store/cart.store';

export function AcademyLayout() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const cartCount=useCartStore(state=>state.items.length);
  useEffect(() => { trackAcademyEvent('PAGE_VIEW'); }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Odkrywaj', icon: LayoutGrid, exact: true },
    { to: '/moje-kursy', label: 'Moja nauka', icon: BookOpen, locked: !isAuthenticated },
    { to: '/quizy', label: 'Wiedza', icon: Sparkles, locked: !isAuthenticated },
    { to: '/certyfikaty', label: 'Certyfikaty', icon: Award, locked: !isAuthenticated },
    { to: '/zapytaj-kosmetologa', label: 'Zapytaj kosmetologa', icon: MessageCircleHeart, locked: !isAuthenticated },
    ...(isAuthenticated ? [{ to: '/profil', label: 'Mój profil', icon: UserRound }] : []),
  ];
  const active = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to);
  const initials = (user?.name?.[0] || user?.email?.[0] || 'W').toUpperCase();

  return (
    <div className="academy-shell">
      <a className="academy-skip-link" href="#academy-main">Przejdź do treści</a>
      <header className={`academy-topbar ${isAuthenticated ? 'authenticated' : 'anonymous'}`}>
        <div className="academy-topbar-inner">
          <Link to="/" className="academy-brand" title="Strona główna Akademii">
            <span className="academy-brand-mark"><GraduationCap className="w-5 h-5" /></span>
            <span><strong>Akademia</strong><em>BeskidStudio</em></span>
          </Link>
          <nav className={`academy-desktop-nav ${isAuthenticated ? 'authenticated' : 'anonymous'}`} aria-label="Główna nawigacja">
            {navItems.map(({ to, label, icon: Icon, exact, locked }) => <Link key={to} to={to} className={`${active(to, exact) ? 'active' : ''}${locked ? ' locked' : ''}`}><Icon className="w-4 h-4" />{label}{locked && <span className="academy-nav-lock">Po zalogowaniu</span>}</Link>)}
          </nav>
          <div className="academy-top-actions">
            <Link to="/koszyk" className="academy-cart-link" aria-label={`Koszyk, ${cartCount} produktów`}><ShoppingCart/>{cartCount>0&&<span>{cartCount}</span>}</Link>
            <a href="https://kosmetologwiktoriacwik.pl" className="hidden xl:flex academy-home-link"><ExternalLink className="w-4 h-4" />Strona Salonu</a>
            {user?.role === 'ADMIN' && <Link to="/admin" className="hidden lg:flex academy-admin-entry"><Settings2 className="w-4 h-4" />Panel admina</Link>}
            {isAuthenticated ? <Link to={user?.role === 'ADMIN' ? '/admin' : '/profil'} className="academy-account" aria-label={user?.role === 'ADMIN' ? 'Przejdź do panelu administratora' : 'Przejdź do mojego profilu'}><span className="academy-avatar" title={user?.name || user?.email}>{initials}</span><span className="hidden sm:block academy-account-copy"><span>{user?.name?.split(' ')[0] || user?.email}</span>{user?.role === 'ADMIN' && <small>Konto administratora</small>}</span><span className="sm:hidden">{user?.role === 'ADMIN' && <small className="academy-admin-badge">Admin</small>}</span></Link> : <Link to="/logowanie" className="academy-login" aria-label="Zaloguj się"><LogIn className="w-4 h-4" /><span className="academy-login-label">Zaloguj się</span></Link>}
            <button onClick={() => setMenuOpen(!menuOpen)} className="academy-menu-button" aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'} aria-expanded={menuOpen} aria-controls="academy-mobile-menu">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav id="academy-mobile-menu" className="academy-mobile-nav" aria-label="Menu mobilne">
          {navItems.map(({ to, label, icon: Icon, exact, locked }) => <Link onClick={() => setMenuOpen(false)} key={to} to={to} className={`${active(to, exact) ? 'active' : ''}${locked ? ' locked' : ''}`}><Icon className="w-4 h-4" />{label}{locked && <span className="academy-nav-lock">Po zalogowaniu</span>}</Link>)}
          {user?.role === 'ADMIN' && <Link onClick={() => setMenuOpen(false)} to="/admin" className="academy-mobile-admin"><Settings2 className="w-4 h-4" />Przejdź do panelu administratora</Link>}
        </nav>}
      </header>
      <main id="academy-main" className="academy-content" tabIndex={-1}><Outlet /></main>
      <footer className="academy-footer"><div><strong>Akademia BeskidStudio</strong><p>BeskidStudio By Wiktoria Ćwik · Mordarka 505, 34-600 Mordarka</p><p><a href="mailto:kontakt@kosmetologwiktoriacwik.pl">kontakt@kosmetologwiktoriacwik.pl</a> · <a href="tel:+48532128227">+48 532 128 227</a></p></div><nav aria-label="Informacje prawne"><Link to="/regulamin">Regulamin</Link><Link to="/polityka-prywatnosci">Prywatność</Link><Link to="/cookies">Cookies</Link><Link to="/odstapienie">Odstąpienie</Link><Link to="/reklamacje">Reklamacje</Link><Link to="/dostepnosc">Dostępność</Link><button onClick={() => window.dispatchEvent(new Event('academy:cookie-settings'))}>Ustawienia cookies</button></nav></footer>
    </div>
  );
}
