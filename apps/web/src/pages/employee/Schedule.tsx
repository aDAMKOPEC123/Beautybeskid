import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  startOfToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { employeesApi, TimeBlock, WeeklyScheduleEntry, WorkDay } from '@/api/employees.api';
import { TimeBlocksEditor } from '@/components/schedule/TimeBlocksEditor';
import { Button } from '@/components/ui/button';

const INPUT_CLS =
  'rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

const DAY_NAMES_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const DAY_NAMES_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

const DEFAULT_BLOCKS: TimeBlock[] = [{ start: '09:00', end: '18:00' }];

// ─── Weekly template section ──────────────────────────────────────────────────

function WeeklyTemplateSection({
  weeklySchedule,
}: {
  weeklySchedule: WeeklyScheduleEntry[];
}) {
  const qc = useQueryClient();

  // Local edits per dayOfWeek
  const [localDays, setLocalDays] = useState<
    Record<number, { isWorking: boolean; timeBlocks: TimeBlock[] }>
  >(() => {
    const init: Record<number, { isWorking: boolean; timeBlocks: TimeBlock[] }> = {};
    for (let d = 0; d < 7; d++) {
      const entry = weeklySchedule.find((e) => e.dayOfWeek === d);
      init[d] = {
        isWorking: entry?.isWorking ?? false,
        timeBlocks: entry?.timeBlocks ?? DEFAULT_BLOCKS,
      };
    }
    return init;
  });

  const { mutate: saveDay, isPending } = useMutation({
    mutationFn: employeesApi.upsertMyWeeklyDay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Harmonogram tygodniowy zapisany');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const updateDay = (
    dow: number,
    patch: Partial<{ isWorking: boolean; timeBlocks: TimeBlock[] }>
  ) => {
    setLocalDays((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }));
  };

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Tygodniowy harmonogram</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ustaw domyślne godziny dla każdego dnia tygodnia. Możesz dodawać przerwy.
        </p>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 7 }, (_, dow) => {
          const day = localDays[dow];
          return (
            <div key={dow} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-sm w-28">{DAY_NAMES_FULL[dow]}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateDay(dow, { isWorking: true })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      day.isWorking
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    Pracuję
                  </button>
                  <button
                    onClick={() => updateDay(dow, { isWorking: false })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      !day.isWorking
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    Wolne
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={isPending}
                  onClick={() => saveDay({ dayOfWeek: dow, ...day })}
                >
                  Zapisz
                </Button>
              </div>

              {day.isWorking && (
                <TimeBlocksEditor
                  blocks={day.timeBlocks}
                  onChange={(blocks) => updateDay(dow, { timeBlocks: blocks })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day override panel ───────────────────────────────────────────────────────

function DayOverridePanel({
  editing,
  weeklySchedule,
  onClose,
  onSaved,
  onDeleted,
}: {
  editing: { date: Date; workDay?: WorkDay };
  weeklySchedule: WeeklyScheduleEntry[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const dow = (editing.date.getDay() + 6) % 7;
  const templateDay = weeklySchedule.find((e) => e.dayOfWeek === dow);

  const defaultBlocks = editing.workDay?.timeBlocks ??
    templateDay?.timeBlocks ??
    DEFAULT_BLOCKS;
  const defaultWorking = editing.workDay?.isWorking ?? templateDay?.isWorking ?? true;

  const [isWorking, setIsWorking] = useState(defaultWorking);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(defaultBlocks);
  const [note, setNote] = useState(editing.workDay?.note ?? '');

  const qc = useQueryClient();

  const { mutate: upsert, isPending: upserting } = useMutation({
    mutationFn: employeesApi.upsertMyWorkDay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Wyjątek zapisany');
      onSaved();
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const { mutate: removeDay } = useMutation({
    mutationFn: employeesApi.deleteMyWorkDay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-schedule'] });
      toast.success('Wyjątek usunięty — obowiązuje harmonogram tygodniowy');
      onDeleted();
    },
    onError: () => toast.error('Błąd usuwania'),
  });

  const handleSave = () => {
    upsert({
      date: format(editing.date, 'yyyy-MM-dd'),
      isWorking,
      timeBlocks: isWorking ? timeBlocks : undefined,
      note: note || undefined,
    });
  };

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between">
        <h2 className="font-semibold text-lg capitalize">
          {format(editing.date, 'EEEE, d MMMM yyyy', { locale: pl })}
        </h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent text-muted-foreground">
          <X size={16} />
        </button>
      </div>

      {templateDay && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          Harmonogram tygodniowy:{' '}
          {templateDay.isWorking
            ? templateDay.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')
            : 'dzień wolny'}
          . Zapis tutaj nadpisze ten dzień.
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Status:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsWorking(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              isWorking ? 'bg-green-100 text-green-800 border-green-300 shadow-sm' : 'border-border hover:bg-accent'
            }`}
          >
            Pracuję
          </button>
          <button
            onClick={() => setIsWorking(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              !isWorking ? 'bg-red-100 text-red-700 border-red-200 shadow-sm' : 'border-border hover:bg-accent'
            }`}
          >
            Wolne
          </button>
        </div>
      </div>

      {isWorking && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Godziny pracy</label>
          <TimeBlocksEditor blocks={timeBlocks} onChange={setTimeBlocks} />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Notatka (opcjonalna)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="np. skrócony dzień, zastępstwo..."
          className={`w-full ${INPUT_CLS}`}
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={upserting}>
          {upserting ? 'Zapisywanie...' : 'Zapisz wyjątek'}
        </Button>
        {editing.workDay && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/30"
            onClick={() => removeDay(editing.workDay!.id)}
          >
            <Trash2 size={14} className="mr-1" /> Usuń wyjątek
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const EmployeeSchedule = () => {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<{ date: Date; workDay?: WorkDay } | null>(null);

  const monthStr = format(viewMonth, 'yyyy-MM');

  const { data, isLoading } = useQuery({
    queryKey: ['my-schedule', monthStr],
    queryFn: () => employeesApi.getMySchedule(monthStr),
  });

  const workDays: WorkDay[] = data?.workDays ?? [];
  const weeklySchedule: WeeklyScheduleEntry[] = data?.weeklySchedule ?? [];
  const employee = data?.employee;

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstOffset = (getDay(days[0]) + 6) % 7;
  const today = startOfToday();

  const handleDayClick = (day: Date) => {
    const workDay = workDays.find((w) => isSameDay(new Date(w.date), day));
    if (selectedDay && isSameDay(selectedDay.date, day)) {
      setSelectedDay(null); // toggle off
    } else {
      setSelectedDay({ date: day, workDay });
    }
  };

  const prevMonth = () => {
    setSelectedDay(null);
    setViewMonth((m) => subMonths(m, 1));
  };
  const nextMonth = () => {
    setSelectedDay(null);
    setViewMonth((m) => addMonths(m, 1));
  };

  if (isLoading)
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Ładowanie...</div>;

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

      {/* Weekly template */}
      <WeeklyTemplateSection weeklySchedule={weeklySchedule} />

      {/* Calendar for day overrides */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Wyjątki dla konkretnych dni</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kliknij dzień w kalendarzu, żeby ustawić inne godziny lub oznaczyć jako wolny.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block" />Wyjątek: pracuje</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />Wyjątek: wolne</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border inline-block" />Wg harmonogramu</span>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold capitalize text-lg">
            {format(viewMonth, 'LLLL yyyy', { locale: pl })}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 select-none">
          {DAY_NAMES_SHORT.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 select-none">
          {Array.from({ length: firstOffset }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const workDay = workDays.find((w) => isSameDay(new Date(w.date), day));
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay ? isSameDay(selectedDay.date, day) : false;

            let bg = '';
            if (workDay) {
              bg = workDay.isWorking
                ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
            } else if (isPast) {
              bg = 'bg-muted/20 border-border opacity-40 cursor-not-allowed';
            } else {
              bg = 'bg-muted/30 border-border hover:bg-accent cursor-pointer';
            }

            return (
              <button
                key={day.toISOString()}
                disabled={isPast}
                onClick={() => !isPast && handleDayClick(day)}
                className={`border rounded-xl p-1 text-center text-xs min-h-[52px] transition-all ${bg} ${
                  isToday ? 'ring-2 ring-primary ring-offset-1' : ''
                } ${isSelected ? 'ring-2 ring-primary scale-105 shadow-md' : ''}`}
              >
                <div className={`font-bold text-sm ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                {workDay?.isWorking && workDay.timeBlocks && (
                  <div className="text-[9px] leading-tight mt-0.5">
                    {workDay.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')}
                  </div>
                )}
                {workDay && !workDay.isWorking && (
                  <div className="text-[9px] leading-tight mt-0.5 font-medium">Wolne</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day override edit panel */}
      {selectedDay && (
        <DayOverridePanel
          key={selectedDay.date.toISOString()}
          editing={selectedDay}
          weeklySchedule={weeklySchedule}
          onClose={() => setSelectedDay(null)}
          onSaved={() => setSelectedDay(null)}
          onDeleted={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
};
