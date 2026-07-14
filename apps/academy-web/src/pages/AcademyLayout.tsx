import { Outlet, Link, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, LayoutGrid, Sparkles, Menu, X, MessageCircleHeart, Settings2, LogIn, UserRound, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return <div className="academy-loading">Przygotowujemy Twoją przestrzeń nauki…</div>;

  const navItems = [
    { to: '/', label: 'Odkrywaj', icon: LayoutGrid, exact: true },
    ...(isAuthenticated ? [{ to: '/moje-kursy', label: 'Moja nauka', icon: BookOpen }, { to: '/profil', label: 'Mój profil', icon: UserRound }] : []),
    ...(user?.hasAcademyAccess || user?.role === 'ADMIN' ? [{ to: '/quizy', label: 'Wiedza', icon: Sparkles }, { to: '/certyfikaty', label: 'Certyfikaty', icon: Award }, { to: '/zapytaj-kosmetologa', label: 'Zapytaj kosmetologa', icon: MessageCircleHeart }] : []),
  ];
  if (user?.role === 'ADMIN') navItems.push({ to: '/studio', label: 'Studio Akademii', icon: Settings2 });
  const active = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to);
  const initials = (user?.name?.[0] || user?.email?.[0] || 'W').toUpperCase();

  return (
    <div className="academy-shell">
      <header className="academy-topbar">
        <div className="academy-topbar-inner">
          <Link to="/" className="academy-brand" aria-label="Akademia BeskidStudio — strona główna">
            <span className="academy-brand-mark"><GraduationCap className="w-5 h-5" /></span>
            <span><strong>Akademia</strong><em>BeskidStudio</em></span>
          </Link>
          <nav className="hidden md:flex academy-desktop-nav" aria-label="Główna nawigacja">
            {navItems.map(({ to, label, icon: Icon, exact }) => <Link key={to} to={to} className={active(to, exact) ? 'active' : ''}><Icon className="w-4 h-4" />{label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <a href="https://kosmetologwiktoriacwik.pl" className="hidden lg:flex academy-home-link"><ExternalLink className="w-4 h-4" />Strona główna</a>
            {isAuthenticated ? <Link to="/profil" className="academy-account"><span className="academy-avatar" title={user?.name || user?.email}>{initials}</span><span className="hidden sm:block">{user?.name?.split(' ')[0] || user?.email}</span></Link> : <a href="https://kosmetologwiktoriacwik.pl/auth/login" className="academy-login"><LogIn className="w-4 h-4" />Zaloguj się</a>}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden academy-menu-button" aria-label="Otwórz menu">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav className="academy-mobile-nav" aria-label="Menu mobilne">
          {navItems.map(({ to, label, icon: Icon, exact }) => <Link onClick={() => setMenuOpen(false)} key={to} to={to} className={active(to, exact) ? 'active' : ''}><Icon className="w-4 h-4" />{label}</Link>)}
        </nav>}
      </header>
      <main className="academy-content"><Outlet /></main>
    </div>
  );
}
