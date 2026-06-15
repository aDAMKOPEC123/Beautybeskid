// filepath: apps/web/src/pages/admin/Dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
};

export const AdminDashboard = () => {
  const { data: recentAppointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'recent'],
    queryFn: () => appointmentsApi.getAll({ limit: 20 }),
  });
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsApi.getToday(),
  });

  const pendingCount = recentAppointments.filter((a: any) => a.status === 'PENDING').length;
  const todayCount = todayAppointments.length;

  return (
    <div className="space-y-6 animate-enter">
      <h1 className="text-3xl font-heading font-bold text-primary">Dashboard Administratora</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle>Oczekujące wizyty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{isLoading ? '...' : pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-accent/20">
          <CardHeader>
            <CardTitle>Wizyty dzisiaj</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{todayCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/wizyty" className="block text-sm text-primary underline-offset-2 hover:underline">
              → Zarządzaj wizytami
            </Link>
            <Link to="/admin/uzytkownicy" className="block text-sm text-primary underline-offset-2 hover:underline">
              → Lista użytkowników
            </Link>
            <Link to="/admin/konsultacje" className="block text-sm text-primary underline-offset-2 hover:underline">
              → Nowe konsultacje
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Ostatnie wizyty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAppointments.slice(0, 5).map((a: any) => (
              <Link
                key={a.id}
                to="/admin/wizyty"
                className="flex flex-col md:flex-row justify-between md:items-center p-4 bg-muted/30 rounded-lg border gap-4 hover:shadow-sm hover:bg-muted/50 transition-all block"
              >
                <div>
                  <p className="font-semibold text-primary">{a.service.name}</p>
                  <p className="text-sm font-medium mt-1">Klient: {a.user.name} <span className="text-muted-foreground font-normal">({a.user.email})</span></p>
                  <p className="text-xs text-muted-foreground mt-1 bg-background inline-block px-2 py-1 rounded-sm border">{new Date(a.date).toLocaleString('pl-PL')}</p>
                </div>
                <div className="flex items-center gap-4 self-start md:self-auto">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${STATUS_COLORS[a.status] ?? 'bg-secondary'}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>
              </Link>
            ))}
            {recentAppointments.length === 0 && !isLoading && (
              <div className="text-muted-foreground p-8 bg-muted/20 border-2 border-dashed rounded-xl text-center">Brak dodanych wizyt.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
