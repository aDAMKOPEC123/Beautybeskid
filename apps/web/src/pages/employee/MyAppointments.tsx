import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { employeesApi } from '@/api/employees.api';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HomecareRoutinePanel } from '@/components/homecare/HomecareRoutinePanel';

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
  COMPLETED: 'bg-primary/20 text-primary',
};

export const EmployeeAppointments = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-employee-appointments'],
    queryFn: employeesApi.getMyAppointments,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['my-employee-appointments'] });
    socket.on('appointment:created', handler);
    socket.on('appointment:updated', handler);
    socket.on('appointment:deleted', handler);
    return () => {
      socket.off('appointment:created', handler);
      socket.off('appointment:updated', handler);
      socket.off('appointment:deleted', handler);
    };
  }, [socket, queryClient]);

  const upcoming = appointments.filter(
    (a: any) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  );
  const past = appointments.filter(
    (a: any) => a.status === 'CANCELLED' || a.status === 'COMPLETED'
  );

  if (isLoading) return <div className="animate-pulse py-12 text-center text-muted-foreground">Ładowanie...</div>;

  return (
    <div className="space-y-8 animate-enter">
      <h1 className="text-3xl font-heading font-bold text-primary">Moje Wizyty</h1>

      {appointments.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground">
          Nie masz jeszcze przypisanych wizyt.
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Nadchodzące ({upcoming.length})</h2>
          <div className="grid gap-4">
            {upcoming.map((a: any) => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Historia</h2>
          <div className="grid gap-4 opacity-70">
            {past.map((a: any) => <AppointmentCard key={a.id} a={a} />)}
          </div>
        </section>
      )}
    </div>
  );
};

function AppointmentCard({ a }: { a: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-heading">{a.service?.name}</CardTitle>
          <p className="text-sm text-muted-foreground font-medium">
            {format(new Date(a.date), "EEEE, d MMMM yyyy 'o' HH:mm", { locale: pl })}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-muted'}`}>
          {STATUS_LABELS[a.status] ?? a.status}
        </span>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <p>Klient: <span className="font-medium text-foreground">{a.user?.name}</span>
          {a.user?.phone && <span> · {a.user.phone}</span>}
        </p>
        {a.allergies && <p className="text-orange-600">⚠ Alergie (wizyta): {a.allergies}</p>}
        {a.notes && <p className="italic">Uwagi: {a.notes}</p>}
        {a.problemDescription && <p>Opis: {a.problemDescription}</p>}
        {(a.user?.cardAllergies || a.user?.cardConditions || a.user?.cardPreferences) && (
          <div className="mt-2 p-2.5 border rounded-lg bg-muted/20 space-y-0.5">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Kartoteka klienta</p>
            {a.user.cardAllergies && <p className="text-orange-600">⚠ Alergie: {a.user.cardAllergies}</p>}
            {a.user.cardConditions && <p>Dolegliwości: <span className="text-foreground">{a.user.cardConditions}</span></p>}
            {a.user.cardPreferences && <p>Upodobania: <span className="text-foreground">{a.user.cardPreferences}</span></p>}
          </div>
        )}
        {a.photoPath && (
          <div className="pt-2">
            <img src={a.photoPath} alt="Zdjęcie klienta" className="w-20 h-20 rounded-lg object-cover border" loading="lazy" />
          </div>
        )}
        {(a.status === 'CONFIRMED' || a.status === 'COMPLETED') && (
          <HomecareRoutinePanel appointmentId={a.id} />
        )}
      </CardContent>
    </Card>
  );
}

