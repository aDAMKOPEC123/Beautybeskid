import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees.api';
import { Clock, X } from 'lucide-react';

interface Props {
  open: boolean;
  mode: 'add' | 'remove';
  onClose: () => void;
  prefill: { date: string; time?: string; employeeId?: string };
  employees: any[];
  appointments: any[];
}

// "13:30" + 60 → "14:30"; nie przekracza doby (23:59 to maksimum).
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return '23:59';
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function WorkHoursModal({ open, mode, onClose, prefill, employees, appointments }: Props) {
  const qc = useQueryClient();
  const startTimeDefault = prefill.time ?? '09:00';

  const [date, setDate] = useState(prefill.date);
  const [from, setFrom] = useState(startTimeDefault);
  const [to, setTo] = useState(addMinutesToTime(startTimeDefault, 60));
  const [appliesToAll, setAppliesToAll] = useState(!prefill.employeeId);
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    prefill.employeeId ? [prefill.employeeId] : [],
  );
  const [error, setError] = useState<string | null>(null);

  const targetIds = appliesToAll ? employees.map((e: any) => e.id) : employeeIds;

  // Przy usuwaniu godzin ostrzegamy o wizytach w tym czasie — nie są ruszane.
  const collidingCount = useMemo(() => {
    if (mode !== 'remove') return 0;
    const s = new Date(`${date}T${from}:00`).getTime();
    const e = new Date(`${date}T${to}:00`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return appointments.filter((appt: any) => {
      if (appt.status === 'CANCELLED') return false;
      if (appt.employeeId && !targetIds.includes(appt.employeeId)) return false;
      const aptStart = new Date(appt.date).getTime();
      const aptEnd = aptStart + (appt.service?.durationMinutes ?? 60) * 60_000;
      return aptStart < e && aptEnd > s;
    }).length;
  }, [mode, appointments, date, from, to, targetIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload = { date, start: from, end: to };
      const failed: string[] = [];
      // Zapisujemy po kolei, pracownica po pracownicy — każda ma własne godziny do scalenia.
      for (const id of targetIds) {
        try {
          if (mode === 'add') await employeesApi.addWorkHours(id, payload);
          else await employeesApi.removeWorkHours(id, payload);
        } catch {
          const emp = employees.find((e: any) => e.id === id);
          failed.push(emp?.name ?? id);
        }
      }
      return failed;
    },
    onSuccess: (failed) => {
      qc.invalidateQueries({ queryKey: ['employee-schedule'] });
      qc.invalidateQueries({ queryKey: ['employee-weekly-schedule'] });
      if (failed.length > 0) {
        setError(`Nie udało się zapisać dla: ${failed.join(', ')}. Pozostałe zmiany zapisano.`);
        return;
      }
      onClose();
    },
    onError: () => setError('Nie udało się zapisać godzin pracy'),
  });

  if (!open) return null;

  const submit = () => {
    setError(null);
    if (to <= from) {
      setError('Godzina zakończenia musi być późniejsza niż rozpoczęcia');
      return;
    }
    if (targetIds.length === 0) {
      setError('Wybierz co najmniej jedną pracownicę');
      return;
    }
    mutate();
  };

  const toggleEmployee = (id: string) =>
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const title = mode === 'add' ? 'Dodaj godziny pracy' : 'Usuń godziny pracy';
  const confirmLabel = mode === 'add' ? 'Dodaj' : 'Usuń';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Clock size={18} className="text-green-600" />
          <h2 className="text-lg font-semibold">{title}</h2>
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

        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-medium">Kogo dotyczy</legend>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={appliesToAll} onChange={() => setAppliesToAll(true)} />
            Cały salon
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={!appliesToAll} onChange={() => setAppliesToAll(false)} />
            Wybrane pracownice
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
            Usunięcie godzin wstrzymuje tylko nowe zapisy.
          </p>
        )}

        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm" onClick={onClose}>Anuluj</button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              mode === 'add' ? 'bg-green-600' : 'bg-red-600'
            }`}
            disabled={isPending}
            onClick={submit}
          >
            {isPending ? 'Zapisywanie…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
