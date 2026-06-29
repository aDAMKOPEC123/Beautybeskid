// filepath: apps/web/src/components/layout/AdminLayout.tsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { useSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/store/chat.store';
import { useNotificationStore } from '@/store/notification.store';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/api/consultations.api';
import { notificationsApi } from '@/api/notifications.api';

export const AdminLayout = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [komunikacjaOpen, setKomunikacjaOpen] = useState(
    () => ['/admin/powiadomienia', '/admin/chat'].some(p => location.pathname.startsWith(p))
  );
  const [wizytyOpen, setWizytyOpen] = useState(
    () => ['/admin/wizyty', '/admin/konsultacje', '/admin/pracownicy', '/admin/praca'].some(p => location.pathname.startsWith(p))
  );
  const [klienciOpen, setKlienciOpen] = useState(
    () => ['/admin/uzytkownicy', '/admin/recenzje', '/admin/beauty-plans'].some(p => location.pathname.startsWith(p))
  );
  const [tresciOpen, setTresciOpen] = useState(
    () => ['/admin/hero', '/admin/polecane-zabiegi', '/admin/o-nas', '/admin/uslugi', '/admin/blog', '/admin/metamorfozy'].some(p => location.pathname.startsWith(p))
  );
  const [diagnostykaOpen, setDiagnostykaOpen] = useState(
    () => ['/admin/quizy', '/admin/pogoda-skory'].some(p => location.pathname.startsWith(p))
  );
  const [akademiaOpen, setAkademiaOpen] = useState(
    () => location.pathname.startsWith('/admin/akademia')
  );
  const [sprzedazOpen, setSprzedazOpen] = useState(
    () => ['/admin/kody-rabatowe', '/admin/lojalnosc', '/admin/asortyment', '/admin/vouchery'].some(p => location.pathname.startsWith(p))
  );
  const [ustawieniaOpen, setUstawieniaOpen] = useState(
    () => ['/admin/regulamin'].some(p => location.pathname.startsWith(p))
  );
  const [marketingOpen, setMarketingOpen] = useState(
    () => location.pathname.startsWith('/admin/marketing')
  );
  const { socket, isConnected } = useSocket();
  const { staffUnreadTotal, setStaffUnreadTotal } = useChatStore();
  const { addNotification, unreadCount, markAllRead } = useNotificationStore();
  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();

  const { data: newLeads = [] } = useQuery({
    queryKey: ['admin', 'consultations', 'active'],
    queryFn: consultationsApi.getActive,
    refetchInterval: 60_000,
    enabled: isAuthenticated && isAdmin,
  });
  const newLeadsCount = newLeads.length;

  const { data: adminNotifUnread = 0 } = useQuery<number>({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!isConnected || !socket) return;

    const onAdminUnread = (count: number) => setStaffUnreadTotal(count);

    const onCreated = (appt: any) => {
      addNotification({
        type: 'created',
        message: `Nowa wizyta: ${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}`,
        appointmentId: appt.id,
        clientName: appt.user?.name,
        serviceName: appt.service?.name,
        timestamp: Date.now(),
      });
      toast.info(`Nowa wizyta: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onUpdated = (appt: any) => {
      addNotification({
        type: 'updated',
        message: `Zaktualizowana wizyta: ${appt.user?.name ?? ''} — ${appt.service?.name ?? ''}`,
        appointmentId: appt.id,
        clientName: appt.user?.name,
        serviceName: appt.service?.name,
        timestamp: Date.now(),
      });
      toast.info(`Zmiana wizyty: ${appt.user?.name ?? ''}`, {
        description: appt.service?.name,
      });
    };

    const onDeleted = (id: string) => {
      addNotification({
        type: 'deleted',
        message: `Wizyta usunięta (ID: ${String(id).slice(0, 8)})`,
        timestamp: Date.now(),
      });
    };

    const onNotificationNew = () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications', 'unread-count'] });
    };

    socket.on('admin:unread_count', onAdminUnread);
    socket.on('appointment:created', onCreated);
    socket.on('appointment:updated', onUpdated);
    socket.on('appointment:deleted', onDeleted);
    socket.on('notification:new', onNotificationNew);

    return () => {
      socket.off('admin:unread_count', onAdminUnread);
      socket.off('appointment:created', onCreated);
      socket.off('appointment:updated', onUpdated);
      socket.off('appointment:deleted', onDeleted);
      socket.off('notification:new', onNotificationNew);
    };
  }, [isConnected, socket, setStaffUnreadTotal, addNotification, queryClient]);

  const komunikacjaBadge = adminNotifUnread + staffUnreadTotal;
  const wizytyBadge = unreadCount + newLeadsCount;

  if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 pt-[72px]">
      <ScrollToTop />
      <Navbar />
      {/* Mobile horizontal nav — md:hidden */}
      <nav className="md:hidden overflow-x-auto border-b bg-card flex gap-1 px-3 py-2 shrink-0" style={{ scrollbarWidth: 'none' }}>
        {[
          { to: '/admin', label: 'Dashboard' },
          { to: '/admin/wizyty', label: 'Wizyty', badge: wizytyBadge },
          { to: '/admin/konsultacje', label: 'Konsultacje', badge: newLeadsCount },
          { to: '/admin/pracownicy', label: 'Pracownicy' },
          { to: '/admin/uzytkownicy', label: 'Użytkownicy' },
          { to: '/admin/chat', label: 'Chat', badge: staffUnreadTotal },
          { to: '/admin/powiadomienia', label: 'Powiadomienia', badge: adminNotifUnread },
          { to: '/admin/uslugi', label: 'Usługi' },
          { to: '/admin/blog', label: 'Blog' },
          { to: '/admin/metamorfozy', label: 'Metamorfozy' },
          { to: '/admin/lojalnosc', label: 'Lojalność' },
          { to: '/admin/kody-rabatowe', label: 'Kody' },
          { to: '/admin/vouchery', label: 'Vouchery' },
          { to: '/admin/recenzje', label: 'Recenzje' },
          { to: '/admin/beauty-plans', label: 'Beauty Plans' },
          { to: '/admin/quizy', label: 'Quizy' },
          { to: '/admin/hero', label: 'Slider' },
          { to: '/admin/polecane-zabiegi', label: 'Polecane' },
          { to: '/admin/o-nas', label: 'O nas' },
          { to: '/admin/regulamin', label: 'Regulamin' },
          { to: '/admin/asortyment', label: 'Asortyment' },
          { to: '/admin/pogoda-skory', label: 'Pogoda skóry' },
          { to: '/admin/akademia', label: 'Akademia' },
          { to: '/admin/forum', label: 'Forum' },
          { to: '/admin/marketing', label: 'Marketing' },
        ].map(({ to, label, badge }) => (
          <Link
            key={to}
            to={to}
            className="relative shrink-0 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors hover:bg-accent"
          >
            {label}
            {badge != null && badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {isSupported && !isSubscribed && permission !== 'denied' && (
        <div className="md:hidden px-3 py-2 border-b bg-card">
          <button
            onClick={subscribe}
            className="w-full text-xs px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            🔔 Włącz powiadomienia push
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-card border-r flex flex-col hidden md:flex">
          <div
            className="p-6 font-heading font-semibold text-lg"
            style={{
              background: 'linear-gradient(135deg, #1A3828 0%, #243f30 100%)',
              borderBottom: '2px solid #C4965A',
              boxShadow: '0 2px 16px rgba(26,56,40,0.18)',
              color: '#fff',
            }}
          >
            Administracja
          </div>
          <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            <Link to="/admin" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">
              Dashboard
            </Link>

            {/* Komunikacja */}
            <div>
              <button
                onClick={() => setKomunikacjaOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Komunikacja</span>
                <div className="flex items-center gap-1.5">
                  {!komunikacjaOpen && komunikacjaBadge > 0 && (
                    <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                      {komunikacjaBadge > 9 ? '9+' : komunikacjaBadge}
                    </span>
                  )}
                  <ChevronDown size={14} className={komunikacjaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </div>
              </button>
              {komunikacjaOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link
                    to="/admin/powiadomienia"
                    className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>Powiadomienia</span>
                    {adminNotifUnread > 0 && (
                      <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                        {adminNotifUnread > 9 ? '9+' : adminNotifUnread}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/chat"
                    className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>Chat</span>
                    {staffUnreadTotal > 0 && (
                      <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                        {staffUnreadTotal > 9 ? '9+' : staffUnreadTotal}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>

            {/* Wizyty i personel */}
            <div>
              <button
                onClick={() => setWizytyOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Wizyty i personel</span>
                <div className="flex items-center gap-1.5">
                  {!wizytyOpen && wizytyBadge > 0 && (
                    <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
                      {wizytyBadge > 9 ? '9+' : wizytyBadge}
                    </span>
                  )}
                  <ChevronDown size={14} className={wizytyOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </div>
              </button>
              {wizytyOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link
                    to="/admin/wizyty"
                    onClick={markAllRead}
                    className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-between ${
                      unreadCount > 0
                        ? 'bg-destructive/10 text-destructive animate-pulse font-semibold'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span>Wizyty</span>
                    {unreadCount > 0 && (
                      <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/konsultacje"
                    className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>Konsultacje</span>
                    {newLeadsCount > 0 && (
                      <span className="bg-primary text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
                        {newLeadsCount > 9 ? '9+' : newLeadsCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/admin/pracownicy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Pracownicy
                  </Link>
                  <Link to="/admin/praca" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Praca
                  </Link>
                </div>
              )}
            </div>

            {/* Klienci */}
            <div>
              <button
                onClick={() => setKlienciOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Klienci</span>
                <ChevronDown size={14} className={klienciOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {klienciOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/uzytkownicy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Użytkownicy
                  </Link>
                  <Link to="/admin/recenzje" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Recenzje
                  </Link>
                  <Link to="/admin/beauty-plans" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Beauty Plans
                  </Link>
                </div>
              )}
            </div>

            {/* Treści */}
            <div>
              <button
                onClick={() => setTresciOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Treści</span>
                <ChevronDown size={14} className={tresciOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {tresciOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/hero" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Slider strony głównej
                  </Link>
                  <Link to="/admin/polecane-zabiegi" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Polecane zabiegi
                  </Link>
                  <Link to="/admin/o-nas" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Strona „O nas"
                  </Link>
                  <Link to="/admin/uslugi" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Zarządzaj Usługami
                  </Link>
                  <Link to="/admin/blog" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Wpisy na Blogu
                  </Link>
                  <Link to="/admin/metamorfozy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Metamorfozy
                  </Link>
                </div>
              )}
            </div>

            {/* Akademia */}
            <div>
              <button
                onClick={() => setAkademiaOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Akademia</span>
                <ChevronDown size={14} className={akademiaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {akademiaOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/akademia" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Kursy i Quizy
                  </Link>
                </div>
              )}
            </div>

            {/* Forum */}
            <div>
              <Link
                to="/admin/forum"
                className="px-4 py-2 flex items-center text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                Forum
              </Link>
            </div>

            {/* Diagnostyka */}
            <div>
              <button
                onClick={() => setDiagnostykaOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Diagnostyka</span>
                <ChevronDown size={14} className={diagnostykaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {diagnostykaOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/quizy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Quizy
                  </Link>
                  <Link to="/admin/pogoda-skory" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Twoja Skóra
                  </Link>
                </div>
              )}
            </div>

            {/* Sprzedaż */}
            <div>
              <button
                onClick={() => setSprzedazOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Sprzedaż</span>
                <ChevronDown size={14} className={sprzedazOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {sprzedazOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/kody-rabatowe" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Kody Rabatowe
                  </Link>
                  <Link to="/admin/vouchery" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Vouchery
                  </Link>
                  <Link to="/admin/lojalnosc" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Program Lojalnościowy
                  </Link>
                  <Link to="/admin/asortyment" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Asortyment
                  </Link>
                </div>
              )}
            </div>

            {/* Ustawienia */}
            <div>
              <button
                onClick={() => setUstawieniaOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Ustawienia</span>
                <ChevronDown size={14} className={ustawieniaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {ustawieniaOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/regulamin" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Regulamin
                  </Link>
                </div>
              )}
            </div>

            {/* Marketing */}
            <div>
              <button
                onClick={() => setMarketingOpen(o => !o)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
              >
                <span>Marketing</span>
                <ChevronDown size={14} className={marketingOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {marketingOpen && (
                <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
                  <Link to="/admin/marketing" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                    Planowanie contentu
                  </Link>
                </div>
              )}
            </div>
          </nav>
          {isSupported && !isSubscribed && permission !== 'denied' && (
            <div className="p-4 border-t">
              <button
                onClick={subscribe}
                className="w-full text-xs px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
              >
                🔔 Włącz powiadomienia push
              </button>
            </div>
          )}
        </aside>
        <main className="flex-1 p-8 overflow-y-auto bg-background/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
