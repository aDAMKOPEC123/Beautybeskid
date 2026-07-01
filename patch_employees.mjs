import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web/src/pages/admin/Employees.tsx';
let content = readFileSync(path, 'utf8');

// Replace imports block to add needed date-fns functions
const oldImports = `import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';`;

const newImports = `import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isBefore,
  startOfToday,
  getMonth,
  getYear,
} from 'date-fns';`;

content = content.replace(oldImports, newImports);

// Replace the icons import to add Lock and AlertCircle
const oldIcons = `import { Plus, ChevronLeft, ChevronRight, Trash2, Key, UserX, Pencil } from 'lucide-react';`;
const newIcons = `import { Plus, ChevronLeft, ChevronRight, Trash2, Key, UserX, Pencil, Lock, AlertCircle } from 'lucide-react';`;
content = content.replace(oldIcons, newIcons);

// Replace the employees API import to add WeekDayInput
const oldApiImport = `import { employeesApi, WorkDay, WeeklyScheduleEntry, TimeBlock } from '@/api/employees.api';`;
const newApiImport = `import { employeesApi, WorkDay, TimeBlock, WeekDayInput } from '@/api/employees.api';`;
content = content.replace(oldApiImport, newApiImport);

// Replace WeeklyScheduleEditor + ScheduleCalendar + ScheduleModalContent with AdminWeekScheduleEditor
const oldComponents = `// ─── Weekly Schedule Editor ───────────────────────────────────────────────────

const DEFAULT_BLOCKS: TimeBlock[] = [{ start: '09:00', end: '18:00' }];
const DAY_NAMES_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];`;

// Find end marker after ScheduleModalContent
const endMarker = `// ─── Employee form ────────────────────────────────────────────────────────────`;

const startIdx = content.indexOf(oldComponents);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.log('START:', startIdx, 'END:', endIdx);
  console.log('NO MATCH');
  process.exit(1);
}

const newComponents = `// ─── Admin week schedule editor ──────────────────────────────────────────────

const DEFAULT_BLOCKS: TimeBlock[] = Object.freeze([{ start: '09:00', end: '18:00' }]) as unknown as TimeBlock[];
const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

interface DayState {
  isWorking: boolean;
  timeBlocks: TimeBlock[];
}

function AdminDayRow({
  date,
  state,
  onChange,
}: {
  date: Date;
  state: DayState;
  onChange: (patch: Partial<DayState>) => void;
}) {
  const label = DAY_NAMES[(date.getDay() + 6) % 7];
  const dateLabel = format(date, 'd MMM', { locale: pl });
  const isToday = isSameDay(date, new Date());

  return (
    <div className={\`border rounded-xl p-3 space-y-2 \${isToday ? 'ring-2 ring-primary' : ''}\`}>
      <div className="flex items-center gap-3">
        <div className="w-36">
          <p className="font-medium text-sm">{label}</p>
          <p className={\`text-xs \${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}\`}>{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ isWorking: true, timeBlocks: state.timeBlocks.length ? state.timeBlocks : DEFAULT_BLOCKS })}
            className={\`px-3 py-1 rounded-full text-xs font-medium border transition-all \${
              state.isWorking ? 'bg-green-100 text-green-800 border-green-300' : 'border-border hover:bg-accent'
            }\`}
          >
            Pracuje
          </button>
          <button
            onClick={() => onChange({ isWorking: false })}
            className={\`px-3 py-1 rounded-full text-xs font-medium border transition-all \${
              !state.isWorking ? 'bg-red-100 text-red-700 border-red-200' : 'border-border hover:bg-accent'
            }\`}
          >
            Wolne
          </button>
        </div>
      </div>
      {state.isWorking && (
        <TimeBlocksEditor
          blocks={state.timeBlocks}
          onChange={(blocks) => onChange({ timeBlocks: blocks })}
        />
      )}
    </div>
  );
}

function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function AdminBlockMonthModal({
  employeeId,
  year,
  month,
  onConfirm,
  onCancel,
  isPending,
}: {
  employeeId: string;
  year: number;
  month: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const monthLabel = format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={20} className="text-destructive" />
          <h3 className="font-semibold text-lg">Zablokuj miesiąc</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Wszystkie dni w miesiącu <strong className="capitalize">{monthLabel}</strong> zostaną oznaczone jako wolne.
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

function AdminWeekScheduleEditor({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showBlockModal, setShowBlockModal] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const today = startOfToday();
  const isPastWeek = isBefore(weekEnd, today);

  const month1 = format(weekStart, 'yyyy-MM');
  const month2 = format(weekEnd, 'yyyy-MM');

  const q1 = useQuery({
    queryKey: ['employee-schedule', employeeId, month1],
    queryFn: () => employeesApi.getSchedule(employeeId, month1),
  });
  const q2 = useQuery({
    queryKey: ['employee-schedule', employeeId, month2],
    queryFn: () => employeesApi.getSchedule(employeeId, month2),
    enabled: month1 !== month2,
  });

  const isLoading = q1.isLoading || (month1 !== month2 && (q2.isLoading ?? false));
  const allWorkDays: WorkDay[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: WorkDay[] = [];
    for (const wd of [...(q1.data ?? []), ...(q2.data ?? [])]) {
      if (!seen.has(wd.id)) { seen.add(wd.id); merged.push(wd); }
    }
    return merged;
  }, [q1.data, q2.data]);

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [dayStates, setDayStates] = useState<Record<string, DayState>>({});

  const dataKey = allWorkDays.map((w) => w.id + String(w.isWorking)).join(',');
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    if (isLoading) return;
    const states: Record<string, DayState> = {};
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const wd = allWorkDays.find((w) => isSameDay(new Date(w.date), day));
      states[key] = { isWorking: wd?.isWorking ?? false, timeBlocks: wd?.timeBlocks ?? DEFAULT_BLOCKS };
    }
    setDayStates(states);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, weekKey]);

  const hasAnyConfig = weekDays.some((day) => allWorkDays.some((w) => isSameDay(new Date(w.date), day)));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['employee-schedule', employeeId, month1] });
    if (month1 !== month2) qc.invalidateQueries({ queryKey: ['employee-schedule', employeeId, month2] });
  };

  const { mutate: saveWeek, isPending: saving } = useMutation({
    mutationFn: (days: WeekDayInput[]) => employeesApi.upsertWeekForEmployee(employeeId, days),
    onSuccess: () => { invalidate(); toast.success('Tydzień zapisany'); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const blockYear = getYear(weekStart);
  const blockMonth = getMonth(weekStart) + 1;

  const { mutate: doBlock, isPending: blocking } = useMutation({
    mutationFn: () => employeesApi.blockMonthForEmployee(employeeId, blockYear, blockMonth),
    onSuccess: () => { invalidate(); setShowBlockModal(false); toast.success('Miesiąc zablokowany'); },
    onError: () => toast.error('Błąd blokowania'),
  });

  const handleSave = () => {
    const days: WeekDayInput[] = weekDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const state = dayStates[key] ?? { isWorking: false, timeBlocks: DEFAULT_BLOCKS };
      return { date: key, isWorking: state.isWorking, timeBlocks: state.isWorking ? state.timeBlocks : undefined };
    });
    saveWeek(days);
  };

  const weekLabel = \`\${format(weekStart, 'd MMM', { locale: pl })} – \${format(weekEnd, 'd MMM yyyy', { locale: pl })}\`;

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart((w) => getWeekStart(subWeeks(w, 1)))} className="p-1.5 rounded hover:bg-accent">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-sm capitalize min-w-[160px] text-center">{weekLabel}</span>
          <button onClick={() => setWeekStart((w) => getWeekStart(addWeeks(w, 1)))} className="p-1.5 rounded hover:bg-accent">
            <ChevronRight size={16} />
          </button>
        </div>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1" onClick={() => setShowBlockModal(true)}>
          <Lock size={12} /> Zablokuj miesiąc
        </Button>
      </div>

      {!hasAnyConfig && !isPastWeek && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Brak wpisów — klienci widzą brak terminów w tym tygodniu.</span>
        </div>
      )}

      {isPastWeek && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Miniony tydzień — tylko do odczytu.</span>
        </div>
      )}

      {(q1.isFetching || q2.isFetching) ? (
        <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">Ładowanie...</div>
      ) : (
        <div className="space-y-2">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            return (
              <AdminDayRow
                key={key}
                date={day}
                state={dayStates[key] ?? { isWorking: false, timeBlocks: DEFAULT_BLOCKS }}
                onChange={(patch) => setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))}
              />
            );
          })}
        </div>
      )}

      {!isPastWeek && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Zapisuję...' : 'Zapisz tydzień'}
        </button>
      )}

      {showBlockModal && (
        <AdminBlockMonthModal
          employeeId={employeeId}
          year={blockYear}
          month={blockMonth}
          onConfirm={doBlock}
          onCancel={() => setShowBlockModal(false)}
          isPending={blocking}
        />
      )}
    </div>
  );
}

`;

content = content.slice(0, startIdx) + newComponents + content.slice(endIdx);

// Replace ScheduleModalContent usage
const oldModalContent = `function ScheduleModalContent({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const [scheduleTab, setScheduleTab] = useState<'weekly' | 'calendar'>('weekly');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
        <button
          onClick={() => setScheduleTab('weekly')}
          className={\`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors \${
            scheduleTab === 'weekly' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }\`}
        >
          Harmonogram tygodniowy
        </button>
        <button
          onClick={() => setScheduleTab('calendar')}
          className={\`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors \${
            scheduleTab === 'calendar' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }\`}
        >
          Wyjątki / Kalendarz
        </button>
      </div>
      {scheduleTab === 'weekly'
        ? <WeeklyScheduleEditor employeeId={employeeId} />
        : <ScheduleCalendar employeeId={employeeId} onClose={onClose} />
      }
    </div>
  );
}`;

// This is now removed already (it was in the replaced block), but we also need to fix the usage in the modal
// The modal now directly renders AdminWeekScheduleEditor
const oldScheduleModal = `      <Modal
        open={modal?.type === 'schedule'}
        onClose={() => setModal(null)}
        title={\`Terminarz — \${modal?.type === 'schedule' ? modal.employee.name : ''}\`}
      >
        {modal?.type === 'schedule' && (
          <ScheduleModalContent employeeId={modal.employee.id} onClose={() => setModal(null)} />
        )}
      </Modal>`;

const newScheduleModal = `      <Modal
        open={modal?.type === 'schedule'}
        onClose={() => setModal(null)}
        title={\`Terminarz — \${modal?.type === 'schedule' ? modal.employee.name : ''}\`}
      >
        {modal?.type === 'schedule' && (
          <AdminWeekScheduleEditor employeeId={modal.employee.id} />
        )}
      </Modal>`;

content = content.replace(oldScheduleModal, newScheduleModal);

// Add missing imports: useState, useEffect, useMemo
const oldReactImport = `import { useState, useEffect } from 'react';`;
const newReactImport = `import { useState, useEffect, useMemo } from 'react';`;
content = content.replace(oldReactImport, newReactImport);

writeFileSync(path, content);
console.log('Done');
