import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, LayoutGrid, Sparkles, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) return <div className="academy-loading">Przygotowujemy Twoją przestrzeń nauki…</div>;

  if (!isAuthenticated) {
    const mainSiteLogin = import.meta.env.VITE_MAIN_SITE_URL ? `${import.meta.env.VITE_MAIN_SITE_URL}/auth/login` : '/auth/login';
    window.location.href = mainSiteLogin;
    return null;
  }
  if (!user?.hasAcademyAccess) return <Navigate to="/brak-dostepu" replace />;

  const navItems = [
    { to: '/', label: 'Odkrywaj', icon: LayoutGrid, exact: true },
    { to: '/moje-kursy', label: 'Moja nauka', icon: BookOpen },
    { to: '/quizy', label: 'Wiedza', icon: Sparkles },
    { to: '/certyfikaty', label: 'Certyfikaty', icon: Award },
  ];
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
            <Link to="/moje-kursy" className="hidden sm:flex academy-home-link"><Home className="w-4 h-4" />Panel nauki</Link>
            <span className="academy-avatar" title={user?.name || user?.email}>{initials}</span>
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
