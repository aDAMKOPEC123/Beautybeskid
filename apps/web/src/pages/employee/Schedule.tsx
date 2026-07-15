import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isBefore,
  startOfToday,
  isSameDay,
  getMonth,
  getYear,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { employeesApi, TimeBlock, WorkDay, WeekDayInput } from '@/api/employees.api';
import { TimeBlocksEditor } from '@/components/schedule/TimeBlocksEditor';
import { Button } from '@/components/ui/button';

const DEFAULT_BLOCKS: TimeBlock[] = Object.freeze([{ start: '09:00', end: '18:00' }]) as TimeBlock[];
const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// ─── Day row ─────────────────────────────────────────────────────────────────

interface DayState {
  isWorking: boolean;
  timeBlocks: TimeBlock[];
}

function DayRow({
  date,
  state,
  readonly,
  onChange,
}: {
  date: Date;
  state: DayState;
  readonly: boolean;
  onChange: (patch: Partial<DayState>) => void;
}) {
  const label = DAY_NAMES[(date.getDay() + 6) % 7];
  const dateLabel = format(date, 'd MMMM', { locale: pl });
  const isToday = isSameDay(date, new Date());

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${isToday ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-40">
          <p className="font-medium text-sm">{label}</p>
          <p className={`text-xs ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            {dateLabel}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            disabled={readonly}
            onClick={() => onChange({ isWorking: true, timeBlocks: state.timeBlocks.length ? state.timeBlocks : DEFAULT_BLOCKS })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              state.isWorking
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'border-border hover:bg-accent'
            }`}
          >
            Pracuję
          </button>
          <button
            disabled={readonly}
            onClick={() => onChange({ isWorking: false })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              !state.isWorking
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'border-border hover:bg-accent'
            }`}
          >
            Wolne
          </button>
        </div>
      </div>

      {state.isWorking && !readonly && (
        <TimeBlocksEditor
          blocks={state.timeBlocks}
          onChange={(blocks) => onChange({ timeBlocks: blocks })}
        />
      )}

      {state.isWorking && readonly && (
        <p className="text-xs text-muted-foreground pl-1">
          {state.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')}
        </p>
      )}
    </div>
  );
}

// ─── Block month modal ────────────────────────────────────────────────────────

function BlockMonthModal({
  year,
  month,
  onConfirm,
  onCancel,
  isPending,
}: {
  year: number;
  month: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const monthLabel = format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={20} className="text-destructive" />
          <h3 className="font-semibold text-lg">Zablokuj miesiąc</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Wszystkie dni w miesiącu <strong className="capitalize">{monthLabel}</strong> zostaną oznaczone jako wolne.
          Klienci nie będą mogli rezerwować wizyt w tym czasie.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Blokuję...' : 'Zablokuj'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Anuluj</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const EmployeeSchedule = () => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showBlockModal, setShowBlockModal] = useState(false);
  const qc = useQueryClient();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const today = startOfToday();
  const isPastWeek = isBefore(weekEnd, today);

  // Always call exactly 2 useQuery hooks — avoids Rules of Hooks violation
  const month1 = format(weekStart, 'yyyy-MM');
  const month2 = format(weekEnd, 'yyyy-MM');

  const q1 = useQuery({
    queryKey: ['my-schedule', month1],
    queryFn: () => employeesApi.getMySchedule(month1),
  });

  const q2 = useQuery({
    queryKey: ['my-schedule', month2],
    queryFn: () => employeesApi.getMySchedule(month2),
    enabled: month1 !== month2, // skip when week is within a single month
  });

  const isLoading = q1.isLoading || (month1 !== month2 && q2.isLoading);
  const employee = q1.data?.employee;

  // Merge workDays from both months (deduplicated by id)
  const allWorkDays: WorkDay[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: WorkDay[] = [];
    for (const wd of [...(q1.data?.workDays ?? []), ...(q2.data?.workDays ?? [])]) {
      if (!seen.has(wd.id)) {
        seen.add(wd.id);
        merged.push(wd);
      }
    }
    return merged;
  }, [q1.data, q2.data]);

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [dayStates, setDayStates] = useState<Record<string, DayState>>({});

  // Re-sync local state when server data or week changes
  const dataKey = allWorkDays.map((w) => w.id + String(w.isWorking)).join(',');
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  useEffect(() => {
    if (isLoading) return;
    const states: Record<string, DayState> = {};
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const wd = allWorkDays.find((w) => isSameDay(new Date(w.date), day));
      states[key] = {
        isWorking: wd?.isWorking ?? false,
        timeBlocks: wd?.timeBlocks ?? DEFAULT_BLOCKS,
      };
    }
    setDayStates(states);
  }, [dataKey, weekKey]);

  const hasAnyConfiguration = weekDays.some((day) =>
    allWorkDays.some((w) => isSameDay(new Date(w.date), day))
  );

  // Mutations
  const { mutate: saveWeek, isPending: saving } = useMutation({
    mutationFn: (days: WeekDayInput[]) => employeesApi.upsertMyWeek(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-schedule', month1] });
      if (month1 !== month2) qc.invalidateQueries({ queryKey: ['my-schedule', month2] });
      toast.success('Tydzień zapisany');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const blockMonthYear = getYear(weekStart);
  const blockMonthMonth = getMonth(weekStart) + 1;

  const { mutate: doBlockMonth, isPending: blocking } = useMutation({
    mutationFn: () => employeesApi.blockMyMonth(blockMonthYear, blockMonthMonth),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-schedule', month1] });
      if (month1 !== month2) qc.invalidateQueries({ queryKey: ['my-schedule', month2] });
      setShowBlockModal(false);
      toast.success('Miesiąc zablokowany');
    },
    onError: () => toast.error('Błąd blokowania'),
  });

  const handleSaveWeek = () => {
    const days: WeekDayInput[] = weekDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const state = dayStates[key] ?? { isWorking: false, timeBlocks: DEFAULT_BLOCKS };
      return {
        date: key,
        isWorking: state.isWorking,
        timeBlocks: state.isWorking ? state.timeBlocks : undefined,
      };
    });
    saveWeek(days);
  };

  const updateDay = (key: string, patch: Partial<DayState>) => {
    setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  if (isLoading)
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Ładowanie...</div>;

  const weekLabel = `${format(weekStart, 'd MMM', { locale: pl })} – ${format(weekEnd, 'd MMM yyyy', { locale: pl })}`;

  return (
    <div className="space-y-6 animate-enter max-w-2xl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-primary">Mój Terminarz</h1>
        {employee && (
          <p className="text-muted-foreground mt-1">
            Witaj, <strong>{employee.name}</strong>
          </p>
        )}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        {/* Week navigation + block month button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => getWeekStart(subWeeks(w, 1)))}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-base capitalize min-w-[200px] text-center">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekStart((w) => getWeekStart(addWeeks(w, 1)))}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
            onClick={() => setShowBlockModal(true)}
          >
            <Lock size={13} />
            Zablokuj miesiąc
          </Button>
        </div>

        {/* Info banners */}
        {!hasAnyConfiguration && !isPastWeek && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Ten tydzień nie ma jeszcze żadnych wpisów — klienci widzą brak dostępnych terminów.</span>
          </div>
        )}

        {isPastWeek && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2.5 text-sm text-muted-foreground">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Miniony tydzień — tryb tylko do odczytu.</span>
          </div>
        )}

        {/* Day rows */}
        {(q1.isFetching || q2.isFetching) ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Ładowanie...</div>
        ) : (
          <div className="space-y-3">
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              return (
                <DayRow
                  key={key}
                  date={day}
                  state={dayStates[key] ?? { isWorking: false, timeBlocks: DEFAULT_BLOCKS }}
                  readonly={isPastWeek}
                  onChange={(patch) => updateDay(key, patch)}
                />
              );
            })}
          </div>
        )}

        {/* Save button */}
        {!isPastWeek && (
          <div className="pt-1">
            <Button onClick={handleSaveWeek} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Zapisuję...' : 'Zapisz tydzień'}
            </Button>
          </div>
        )}
      </div>

      {/* Block month modal */}
      {showBlockModal && (
        <BlockMonthModal
          year={blockMonthYear}
          month={blockMonthMonth}
          onConfirm={doBlockMonth}
          onCancel={() => setShowBlockModal(false)}
          isPending={blocking}
        />
      )}
    </div>
  );
};
