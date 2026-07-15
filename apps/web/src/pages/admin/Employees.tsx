import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
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
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Key, UserX, Pencil, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { employeesApi, WorkDay, TimeBlock, WeekDayInput } from '@/api/employees.api';
import { TimeBlocksEditor } from '@/components/schedule/TimeBlocksEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HappyHourModal } from './HappyHourModal';

// ─── Small helpers ────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-heading font-bold text-xl">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

// ─── Admin week schedule editor ──────────────────────────────────────────────

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
    <div className={`border rounded-xl p-3 space-y-2 ${isToday ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-36">
          <p className="font-medium text-sm">{label}</p>
          <p className={`text-xs ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ isWorking: true, timeBlocks: state.timeBlocks.length ? state.timeBlocks : DEFAULT_BLOCKS })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              state.isWorking ? 'bg-green-100 text-green-800 border-green-300' : 'border-border hover:bg-accent'
            }`}
          >
            Pracuje
          </button>
          <button
            onClick={() => onChange({ isWorking: false })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              !state.isWorking ? 'bg-red-100 text-red-700 border-red-200' : 'border-border hover:bg-accent'
            }`}
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

  const weekLabel = `${format(weekStart, 'd MMM', { locale: pl })} – ${format(weekEnd, 'd MMM yyyy', { locale: pl })}`;

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart((w) => getWeekStart(subWeeks(w, 1)))} className="p-1.5 rounded hover:bg-accent">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-0 text-center text-sm font-semibold capitalize sm:min-w-[160px]">{weekLabel}</span>
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

// ─── Employee form ────────────────────────────────────────────────────────────

function EmployeeForm({ initial, onSubmit, isPending }: {
  initial?: any;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [specialties, setSpecialties] = useState<string>((initial?.specialties ?? []).join(', '));
  const [avatar, setAvatar] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', name);
    fd.append('bio', bio);
    fd.append('specialties', JSON.stringify(specialties.split(',').map((s) => s.trim()).filter(Boolean)));
    if (avatar) fd.append('avatar', avatar);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Imię i nazwisko *">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={INPUT_CLS} placeholder="Anna Kowalska" />
      </Field>
      <Field label="Bio">
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={INPUT_CLS} placeholder="Specjalistka od..." />
      </Field>
      <Field label="Specjalizacje (po przecinku)">
        <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} className={INPUT_CLS} placeholder="Manicure, Pedicure, Depilacja" />
      </Field>
      <Field label="Zdjęcie">
        <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} className="text-sm" />
      </Field>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Zapisywanie...' : initial ? 'Zapisz zmiany' : 'Dodaj pracownika'}
      </Button>
    </form>
  );
}

// ─── Create account form ──────────────────────────────────────────────────────

function AccountForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => employeesApi.createAccount(employeeId, {
      email,
      password: password.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees-admin'] });
      toast.success('Konto pracownicze utworzone');
      onDone();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Błąd tworzenia konta'),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutate(); }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Nowe konto otrzyma uprawnienia <strong>Pracownika</strong>. Pracownik może logować się normalnie i zarządzać swoim terminarzem.
      </p>
      <Field label="Adres email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT_CLS} />
      </Field>
      <Field label="Hasło tymczasowe">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} className={INPUT_CLS} />
        <p className="mt-1 text-xs text-muted-foreground">
          Zostaw puste, jeśli chcesz podpiąć istniejące konto admina lub użytkownika po emailu.
        </p>
      </Field>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Tworzenie...' : 'Utwórz konto'}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AdminEmployees = () => {
  const qc = useQueryClient();

  const [modal, setModal] = useState<
    | { type: 'create' }
    | { type: 'edit'; employee: any }
    | { type: 'account'; employee: any }
    | { type: 'schedule'; employee: any }
    | { type: 'happy-hours' }
    | null
  >(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-admin'],
    queryFn: employeesApi.getAll,
  });

  const { mutate: createEmp, isPending: creating } = useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-admin'] }); toast.success('Pracownik dodany'); setModal(null); },
    onError: () => toast.error('Błąd dodawania'),
  });

  const { mutate: updateEmp, isPending: updating } = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => employeesApi.update(id, fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-admin'] }); toast.success('Zapisano'); setModal(null); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const { mutate: revokeAcc } = useMutation({
    mutationFn: employeesApi.revokeAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-admin'] }); toast.success('Konto odebrane'); },
    onError: () => toast.error('Błąd'),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: employeesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees-admin'] }); toast.success('Pracownik dezaktywowany'); },
    onError: () => toast.error('Błąd'),
  });

  if (isLoading)
    return <div className="animate-pulse py-16 text-center text-muted-foreground">Ładowanie...</div>;

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-heading font-bold text-primary">Pracownicy</h1>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" onClick={() => setModal({ type: 'happy-hours' })}>
            ⭐ Happy Hours
          </Button>
          <Button onClick={() => setModal({ type: 'create' })}>
            <Plus size={16} className="mr-1.5" /> Nowy pracownik
          </Button>
        </div>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground">
          Brak pracowników. Dodaj pierwszego.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp: any) => (
          <Card key={emp.id} className={`${!emp.isActive ? 'opacity-50' : ''}`}>
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                  {emp.avatarPath
                    ? <img src={emp.avatarPath} alt={emp.name} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.isActive ? 'Aktywny' : 'Dezaktywowany'}</p>
                </div>
              </div>

              {/* Specialties */}
              {emp.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {emp.specialties.map((s: string) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{s}</span>
                  ))}
                </div>
              )}

              {/* Account status */}
              <div className="text-xs">
                {emp.user ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <span className="text-green-700 font-medium truncate">{emp.user.email}</span>
                    <button
                      onClick={() => { if (confirm('Odebrać dostęp?')) revokeAcc(emp.id); }}
                      className="text-red-500 hover:text-red-700 ml-2 shrink-0"
                      title="Odbierz dostęp"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">Brak konta</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setModal({ type: 'edit', employee: emp })}>
                  <Pencil size={12} className="mr-1" /> Edytuj
                </Button>
                {!emp.user && (
                  <Button size="sm" variant="outline" onClick={() => setModal({ type: 'account', employee: emp })}>
                    <Key size={12} className="mr-1" /> Konto
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setModal({ type: 'schedule', employee: emp })}>
                  Terminarz
                </Button>
                {emp.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    onClick={() => { if (confirm('Dezaktywować pracownika?')) deactivate(emp.id); }}
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Nowy pracownik">
        <EmployeeForm onSubmit={(fd) => createEmp(fd)} isPending={creating} />
      </Modal>

      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edytuj pracownika">
        {modal?.type === 'edit' && (
          <EmployeeForm
            initial={modal.employee}
            onSubmit={(fd) => updateEmp({ id: modal.employee.id, fd })}
            isPending={updating}
          />
        )}
      </Modal>

      <Modal open={modal?.type === 'account'} onClose={() => setModal(null)} title="Utwórz konto pracownicze">
        {modal?.type === 'account' && (
          <AccountForm employeeId={modal.employee.id} onDone={() => setModal(null)} />
        )}
      </Modal>

      <Modal
        open={modal?.type === 'schedule'}
        onClose={() => setModal(null)}
        title={`Terminarz — ${modal?.type === 'schedule' ? modal.employee.name : ''}`}
      >
        {modal?.type === 'schedule' && (
          <AdminWeekScheduleEditor employeeId={modal.employee.id} />
        )}
      </Modal>

      <Modal
        open={modal?.type === 'happy-hours'}
        onClose={() => setModal(null)}
        title="⭐ Happy Hours"
      >
        {modal?.type === 'happy-hours' && (
          <HappyHourModal onClose={() => setModal(null)} />
        )}
      </Modal>
    </div>
  );
};
