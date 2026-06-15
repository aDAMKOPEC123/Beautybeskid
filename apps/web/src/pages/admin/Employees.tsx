import { useState, useEffect } from 'react';
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
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, Key, UserX, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { employeesApi, WorkDay, WeeklyScheduleEntry, TimeBlock } from '@/api/employees.api';
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

// ─── Weekly Schedule Editor ───────────────────────────────────────────────────

const DEFAULT_BLOCKS: TimeBlock[] = [{ start: '09:00', end: '18:00' }];
const DAY_NAMES_FULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

function WeeklyScheduleEditor({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();

  const { data: schedule = [], isLoading } = useQuery<WeeklyScheduleEntry[]>({
    queryKey: ['employee-weekly-schedule', employeeId],
    queryFn: () => employeesApi.getWeeklySchedule(employeeId),
  });

  type DayState = { dayOfWeek: number; isWorking: boolean; timeBlocks: TimeBlock[] };

  const buildDays = (src: WeeklyScheduleEntry[]): DayState[] =>
    Array.from({ length: 7 }, (_, i) => {
      const entry = src.find((e) => e.dayOfWeek === i);
      return {
        dayOfWeek: i,
        isWorking: entry?.isWorking ?? false,
        timeBlocks: entry?.timeBlocks ?? DEFAULT_BLOCKS,
      };
    });

  const [days, setDays] = useState<DayState[]>(() => buildDays(schedule));

  useEffect(() => {
    setDays(buildDays(schedule));
  }, [schedule]);

  const [saving, setSaving] = useState(false);

  const updateDay = (i: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d) => (d.dayOfWeek === i ? { ...d, ...patch } : d)));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const day of days) {
        await employeesApi.upsertEmployeeWeeklyDay(employeeId, day);
      }
      qc.invalidateQueries({ queryKey: ['employee-weekly-schedule', employeeId] });
      toast.success('Harmonogram zapisany');
    } catch {
      toast.error('Błąd zapisu harmonogramu');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground animate-pulse">Ładowanie...</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{DAY_NAMES_FULL[day.dayOfWeek]}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => updateDay(day.dayOfWeek, { isWorking: true })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    day.isWorking ? 'bg-green-100 text-green-800 border-green-300' : 'border-border hover:bg-accent'
                  }`}
                >
                  Pracuje
                </button>
                <button
                  onClick={() => updateDay(day.dayOfWeek, { isWorking: false })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    !day.isWorking ? 'bg-red-100 text-red-700 border-red-200' : 'border-border hover:bg-accent'
                  }`}
                >
                  Wolne
                </button>
              </div>
            </div>
            {day.isWorking && (
              <TimeBlocksEditor
                blocks={day.timeBlocks}
                onChange={(blocks) => updateDay(day.dayOfWeek, { timeBlocks: blocks })}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Zapisywanie...' : 'Zapisz harmonogram'}
      </button>
    </div>
  );
}

// ─── Schedule Calendar ────────────────────────────────────────────────────────

function ScheduleCalendar({
  employeeId,
  onClose: _onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [editing, setEditing] = useState<{ date: Date; workDay?: WorkDay } | null>(null);
  const [isWorking, setIsWorking] = useState(true);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(DEFAULT_BLOCKS);
  const [note, setNote] = useState('');

  const monthStr = format(viewMonth, 'yyyy-MM');

  const { data: workDays = [] } = useQuery<WorkDay[]>({
    queryKey: ['employee-schedule', employeeId, monthStr],
    queryFn: () => employeesApi.getSchedule(employeeId, monthStr),
  });

  const { data: weeklySchedule = [] } = useQuery<WeeklyScheduleEntry[]>({
    queryKey: ['employee-weekly-schedule', employeeId],
    queryFn: () => employeesApi.getWeeklySchedule(employeeId),
  });

  const { mutate: upsert, isPending: upserting } = useMutation({
    mutationFn: (data: any) => employeesApi.upsertWorkDay(employeeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-schedule', employeeId] });
      toast.success('Terminarz zapisany');
      setEditing(null);
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const { mutate: removeDay } = useMutation({
    mutationFn: (dayId: string) => employeesApi.deleteWorkDay(employeeId, dayId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-schedule', employeeId] });
      toast.success('Dzień usunięty');
      setEditing(null);
    },
    onError: () => toast.error('Błąd usuwania'),
  });

  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstOffset = (getDay(days[0]) + 6) % 7;
  const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const openEdit = (day: Date) => {
    const workDay = workDays.find((w) => isSameDay(new Date(w.date), day));
    const dow = (day.getDay() + 6) % 7;
    const templateDay = weeklySchedule.find((e) => e.dayOfWeek === dow);
    const initBlocks = workDay?.timeBlocks ?? templateDay?.timeBlocks ?? DEFAULT_BLOCKS;
    const initWorking = workDay?.isWorking ?? templateDay?.isWorking ?? true;
    setIsWorking(initWorking);
    setTimeBlocks(initBlocks);
    setNote(workDay?.note ?? '');
    setEditing({ date: day, workDay });
  };

  const handleSave = () => {
    if (!editing) return;
    upsert({
      date: format(editing.date, 'yyyy-MM-dd'),
      isWorking,
      timeBlocks: isWorking ? timeBlocks : undefined,
      note: note || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setViewMonth((m) => subMonths(m, 1))} className="p-1 rounded hover:bg-accent">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold capitalize">
          {format(viewMonth, 'LLLL yyyy', { locale: pl })}
        </span>
        <button onClick={() => setViewMonth((m) => addMonths(m, 1))} className="p-1 rounded hover:bg-accent">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400 inline-block" />Wyjątek: pracuje</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />Wyjątek: wolne</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" />Wg harm. (pracuje)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-50 border border-orange-200 inline-block" />Wg harm. (wolne)</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 mb-1 select-none">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 select-none">
        {Array.from({ length: firstOffset }).map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const workDay = workDays.find((w) => isSameDay(new Date(w.date), day));
          const dow = (day.getDay() + 6) % 7;
          const weeklyEntry = weeklySchedule.find((e) => e.dayOfWeek === dow);
          const isToday = isSameDay(day, new Date());

          let bg: string;
          let label: React.ReactNode = null;

          if (workDay) {
            // Override exists
            bg = workDay.isWorking
              ? 'bg-green-100 border-green-300 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700';
            if (workDay.isWorking && workDay.timeBlocks?.length) {
              label = <div className="text-[9px] leading-tight mt-0.5 opacity-80">{workDay.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')}</div>;
            } else if (!workDay.isWorking) {
              label = <div className="text-[9px] leading-tight mt-0.5 opacity-80">Wolne</div>;
            }
          } else if (weeklyEntry) {
            // Show weekly schedule
            bg = weeklyEntry.isWorking
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-orange-50 border-orange-200 text-orange-700';
            if (weeklyEntry.isWorking && weeklyEntry.timeBlocks?.length) {
              label = <div className="text-[9px] leading-tight mt-0.5 opacity-60">{weeklyEntry.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')}</div>;
            } else if (!weeklyEntry.isWorking) {
              label = <div className="text-[9px] leading-tight mt-0.5 opacity-60">Wg harm.</div>;
            }
          } else {
            bg = 'bg-muted/30 border-border';
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => openEdit(day)}
              className={`border rounded-lg p-1 text-center text-xs cursor-pointer hover:opacity-80 transition-opacity min-h-[48px] ${bg} ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className={`font-bold ${isToday ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
              {label}
            </button>
          );
        })}
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
          <p className="font-semibold">
            {format(editing.date, 'EEEE, d MMMM yyyy', { locale: pl })}
          </p>

          {/* Weekly schedule info */}
          {(() => {
            const dow = (editing.date.getDay() + 6) % 7;
            const templateDay = weeklySchedule.find((e) => e.dayOfWeek === dow);
            if (!templateDay) return null;
            return (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Harmonogram tygodniowy:{' '}
                {templateDay.isWorking
                  ? templateDay.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')
                  : 'dzień wolny'}
                . Zapis tutaj nadpisze ten dzień.
              </p>
            );
          })()}

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Status:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsWorking(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  isWorking ? 'bg-green-100 text-green-800 border-green-300' : 'border-border hover:bg-accent'
                }`}
              >
                Pracuje
              </button>
              <button
                onClick={() => setIsWorking(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  !isWorking ? 'bg-red-100 text-red-700 border-red-200' : 'border-border hover:bg-accent'
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

          <Field label="Notatka (opcjonalnie)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. zastępstwo" className={INPUT_CLS} />
          </Field>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={upserting} size="sm">
              {upserting ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
            {editing.workDay && (
              <Button variant="outline" size="sm" onClick={() => removeDay(editing.workDay!.id)} className="text-destructive border-destructive/50">
                <Trash2 size={14} className="mr-1" /> Usuń wpis
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Anuluj</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Modal Content (tabs) ────────────────────────────────────────────

function ScheduleModalContent({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const [scheduleTab, setScheduleTab] = useState<'weekly' | 'calendar'>('weekly');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
        <button
          onClick={() => setScheduleTab('weekly')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
            scheduleTab === 'weekly' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
        >
          Harmonogram tygodniowy
        </button>
        <button
          onClick={() => setScheduleTab('calendar')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
            scheduleTab === 'calendar' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
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
    mutationFn: () => employeesApi.createAccount(employeeId, { email, password }),
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
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={INPUT_CLS} />
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-heading font-bold text-primary">Pracownicy</h1>
        <div className="flex gap-2">
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
          <ScheduleModalContent employeeId={modal.employee.id} onClose={() => setModal(null)} />
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
