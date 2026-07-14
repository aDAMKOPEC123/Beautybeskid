import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, LayoutDashboard, MessageCircleHeart, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { to: '/admin', label: 'Kursy i programy', icon: LayoutDashboard, exact: true },
  { to: '/admin/wiadomosci', label: 'Wiadomości Akademii', icon: MessageCircleHeart },
];

export function AcademyAdminLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="academy-loading">Przygotowujemy panel administratora…</div>;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <div className="academy-admin-shell">
    <aside className="academy-admin-sidebar">
      <Link className="academy-admin-brand" to="/admin"><span><GraduationCap /></span><strong>Akademia<em>administracja</em></strong></Link>
      <p className="academy-admin-label">Zarządzanie</p>
      <nav aria-label="Panel administratora">{navigation.map(({ to, label, icon: Icon, exact }) => <Link key={to} to={to} className={(exact ? location.pathname === to : location.pathname.startsWith(to)) ? 'active' : ''}><Icon />{label}</Link>)}</nav>
      <div className="academy-admin-user"><ShieldCheck /><div><strong>{user.name || user.email}</strong><span>Konto administratora</span></div></div>
      <Link className="academy-admin-back" to="/"><BookOpen />Wróć do Akademii</Link>
    </aside>
    <header className="academy-admin-mobilebar"><div><Link to="/admin"><GraduationCap />Administracja</Link><Link to="/"><ExternalLink />Akademia</Link></div><nav aria-label="Panel administratora na telefonie">{navigation.map(({ to, label, icon: Icon, exact }) => <Link key={to} to={to} className={(exact ? location.pathname === to : location.pathname.startsWith(to)) ? 'active' : ''}><Icon />{label}</Link>)}</nav></header>
    <main className="academy-admin-content"><Outlet /></main>
  </div>;
}
