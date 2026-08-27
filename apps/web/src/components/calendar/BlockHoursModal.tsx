import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import calendarBlocksApi from '@/api/calendar-blocks.api';
import { Lock, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  prefill: { date: string; time?: string; employeeId?: string };
  employees: any[];
  appointments: any[];
}

// "13:30" + 60 → "14:30". Wynik jest ograniczony do tej samej doby (max "23:59") —
// modal nie obsługuje blokad przechodzących przez północ, więc np. "23:30" + 60 min
// nie może "zawinąć" do "00:30", bo to dałoby domyślnie `to` wcześniejsze niż `from`.
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return '23:59';
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function BlockHoursModal({ open, onClose, prefill, employees, appointments }: Props) {
  const qc = useQueryClient();
  const startTimeDefault = prefill.time ?? '09:00';

  const [date, setDate] = useState(prefill.date);
  const [from, setFrom] = useState(startTimeDefault);
  const [to, setTo] = useState(addMinutesToTime(startTimeDefault, 60));
  const [reason, setReason] = useState('');
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    prefill.employeeId ? [prefill.employeeId] : [],
  );
  const [error, setError] = useState<string | null>(null);

  const startsAt = `${date}T${from}:00`;
  const endsAt = `${date}T${to}:00`;

  // Wizyty kolidujące z zakresem — tylko ostrzeżenie, blokada ich nie rusza.
  const collidingCount = useMemo(() => {
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return appointments.filter((appt: any) => {
      if (appt.status === 'CANCELLED') return false;
      if (!appliesToAll && appt.employeeId && !employeeIds.includes(appt.employeeId)) return false;
      const aptStart = new Date(appt.date).getTime();
      const aptEnd = aptStart + (appt.service?.durationMinutes ?? 60) * 60_000;
      return aptStart < e && aptEnd > s;
    }).length;
  }, [appointments, startsAt, endsAt, appliesToAll, employeeIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      calendarBlocksApi.create({
        startsAt,
        endsAt,
        reason: reason.trim() || undefined,
        appliesToAll,
        employeeIds: appliesToAll ? undefined : employeeIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Nie udało się zapisać blokady');
    },
  });

  if (!open) return null;

  const submit = () => {
    setError(null);
    if (to <= from) {
      setError('Godzina zakończenia musi być późniejsza niż rozpoczęcia');
      return;
    }
    if (!appliesToAll && employeeIds.length === 0) {
      setError('Wybierz co najmniej jednego pracownika');
      return;
    }
    mutate();
  };

  const toggleEmployee = (id: string) =>
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} className="text-gray-700" />
          <h2 className="text-lg font-semibold">Zablokuj godziny</h2>
          <button className="ml-auto rounded-lg p-1 hover:bg-accent" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-sm">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>

        <div className="mb-3 flex gap-3">
          <label className="flex-1 text-sm">
            Od
            <input type="time" step={900} value={from} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex-1 text-sm">
            Do
            <input type="time" step={900} value={to} onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
        </div>

        <label className="mb-3 block text-sm">
          Powód (opcjonalnie, widoczny tylko dla personelu)
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="np. wizyta u lekarza"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>

        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-medium">Kogo dotyczy</legend>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={appliesToAll} onChange={() => setAppliesToAll(true)} />
            Cały salon
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={!appliesToAll} onChange={() => setAppliesToAll(false)} />
            Wybrani pracownicy
          </label>
          {!appliesToAll && (
            <div className="mt-1 space-y-1 pl-6">
              {employees.map((emp: any) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={employeeIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                  {emp.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {collidingCount > 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            W tym czasie {collidingCount === 1 ? 'jest 1 wizyta' : `są ${collidingCount} wizyty`} — pozostaną bez zmian.
            Blokada wstrzymuje tylko nowe zapisy.
          </p>
        )}

        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm" onClick={onClose}>Anuluj</button>
          <button className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isPending} onClick={submit}>
            {isPending ? 'Zapisywanie…' : 'Zablokuj'}
          </button>
        </div>
      </div>
    </div>
  );
}
