import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, LayoutGrid, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!user?.hasAcademyAccess) return <Navigate to="/akademia/brak-dostepu" replace />;

  const navItems = [
    { to: '/akademia', label: 'Katalog', icon: LayoutGrid, exact: true },
    { to: '/akademia/moje-kursy', label: 'Moje Kursy', icon: BookOpen },
    { to: '/akademia/quizy', label: 'Quizy', icon: Star },
    { to: '/akademia/certyfikaty', label: 'Certyfikaty', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <span className="font-heading font-semibold text-lg">Akademia BeskidStudio By Wiktoria Ćwik</span>
        </div>
      </header>

      {/* Mobile horizontal nav */}
      <nav className="md:hidden overflow-x-auto border-b bg-card flex gap-1 px-3 py-2 shrink-0" style={{ scrollbarWidth: 'none' }}>
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        <aside className="w-48 shrink-0 hidden md:block">
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
