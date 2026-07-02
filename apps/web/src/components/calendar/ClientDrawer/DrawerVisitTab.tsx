import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Check, X } from 'lucide-react';
import { usersApi } from '@/api/users.api';
import { appointmentsApi } from '@/api/appointments.api';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  appointment: any;
}

export function DrawerVisitTab({ appointment }: Props) {
  const qc = useQueryClient();
  const [editingTime, setEditingTime] = useState(false);

  const apptStart = new Date(appointment.date);
  const apptDurationMin =
    (appointment as any).customDurationMinutes ?? appointment.service?.durationMinutes ?? 0;
  const apptEnd = new Date(apptStart.getTime() + apptDurationMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [editDate, setEditDate] = useState(toDateStr(apptStart));
  const [editTimeFrom, setEditTimeFrom] = useState(toTimeStr(apptStart));
  const [editTimeTo, setEditTimeTo] = useState(toTimeStr(apptEnd));

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user', appointment.userId],
    queryFn: () => usersApi.getById(appointment.userId),
    staleTime: 2 * 60 * 1000,
    enabled: !!appointment.userId,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(appointment.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const updateTime = useMutation({
    mutationFn: () => {
      const [dh, dm] = editTimeFrom.split(':').map(Number);
      const [th, tm] = editTimeTo.split(':').map(Number);
      const newStart = new Date(editDate);
      newStart.setHours(dh, dm, 0, 0);
      const duration = Math.max((th * 60 + tm) - (dh * 60 + dm), 1);
      return appointmentsApi.updateTime(appointment.id, {
        date: newStart.toISOString(),
        customDurationMinutes: duration,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setEditingTime(false);
      toast.success('Czas wizyty zaktualizowany');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Błąd aktualizacji czasu');
    },
  });

  if (isLoading && appointment.userId) return (
    <div className="space-y-3 p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania danych.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const hasAllergies = !!(user as any)?.cardAllergies || !!(user as any)?.cardConditions;

  const fmt = (d: Date) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const timeRange = apptDurationMin > 0
    ? `${fmt(apptStart)} – ${fmt(apptEnd)}`
    : fmt(apptStart);

  return (
    <div className="p-3 space-y-3 text-sm">
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Usługa</div>
        <div className="font-semibold">{appointment.service?.name ?? '—'}</div>
        {!editingTime ? (
          <div className="flex items-center gap-2 text-gray-500">
            <span>
              {timeRange}
              {appointment.service?.price != null ? ` · ${appointment.service.price} zł` : ''}
              {apptDurationMin > 0 && ` · ${apptDurationMin} min`}
            </span>
            {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
              <button
                onClick={() => setEditingTime(true)}
                className="text-gray-400 hover:text-gray-600"
                title="Edytuj czas wizyty"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div>
              <label className="text-xs text-gray-400">Data</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full text-xs border border-input rounded px-2 py-1 bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">Od</label>
                <input
                  type="time"
                  value={editTimeFrom}
                  onChange={(e) => {
                    const [oh, om] = editTimeFrom.split(':').map(Number);
                    const [th, tm] = editTimeTo.split(':').map(Number);
                    const dur = (th * 60 + tm) - (oh * 60 + om);
                    const [nh, nm] = e.target.value.split(':').map(Number);
                    const newEnd = nh * 60 + nm + Math.max(dur, 1);
                    const newTo = `${pad(Math.floor(newEnd / 60) % 24)}:${pad(newEnd % 60)}`;
                    setEditTimeFrom(e.target.value);
                    setEditTimeTo(newTo);
                  }}
                  className="w-full text-xs border border-input rounded px-2 py-1 bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">
                  Do{' '}
                  <span className="text-violet-500">
                    ({Math.max(
                      (() => {
                        const [fh, fm] = editTimeFrom.split(':').map(Number);
                        const [th, tm] = editTimeTo.split(':').map(Number);
                        return (th * 60 + tm) - (fh * 60 + fm);
                      })(),
                      1,
                    )} min)
                  </span>
                </label>
                <input
                  type="time"
                  value={editTimeTo}
                  onChange={(e) => setEditTimeTo(e.target.value)}
                  className="w-full text-xs border border-input rounded px-2 py-1 bg-background"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingTime(false)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-input hover:bg-accent"
              >
                <X size={12} /> Anuluj
              </button>
              <button
                onClick={() => updateTime.mutate()}
                disabled={updateTime.isPending}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Check size={12} /> {updateTime.isPending ? 'Zapisuję...' : 'Zapisz'}
              </button>
            </div>
          </div>
        )}
      </div>

      {hasAllergies && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded p-2">
          <div className="text-xs font-semibold text-red-600 mb-1">⚠️ Alergie / Schorzenia</div>
          {(user as any)?.cardAllergies && <div className="text-xs text-gray-700">{(user as any).cardAllergies}</div>}
          {(user as any)?.cardConditions && <div className="text-xs text-gray-700">{(user as any).cardConditions}</div>}
        </div>
      )}

      {(user as any)?.cardPreferences && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Preferencje</div>
          <div className="text-gray-600 text-xs">{(user as any).cardPreferences}</div>
        </div>
      )}

      {(user as any)?.cardStaffNotes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notatki pracownika</div>
          <div className="text-gray-600 text-xs">{(user as any).cardStaffNotes}</div>
        </div>
      )}

      {appointment.notes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Uwagi do wizyty</div>
          <div className="text-gray-600 text-xs">{appointment.notes}</div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {appointment.status === 'PENDING' && (
          <button
            onClick={() => updateStatus.mutate('CONFIRMED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-green-600 text-white text-xs py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Potwierdź
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('COMPLETED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Zrealizowana
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('CANCELLED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-red-500 text-white text-xs py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Anuluj
          </button>
        )}
      </div>
    </div>
  );
}
