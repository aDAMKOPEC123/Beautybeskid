import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import happyHoursApi from '@/api/happy-hours.api';
import { employeesApi } from '@/api/employees.api';
import { servicesApi } from '@/api/services.api';
import { Button } from '@/components/ui/button';

const INPUT_CLS =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

type FormState = {
  name: string;
  type: 'ONE_TIME' | 'RECURRING';
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: string;
  isAllEmployees: boolean;
  isAllServices: boolean;
  employeeIds: string[];
  serviceIds: string[];
};

const defaultForm: FormState = {
  name: '',
  type: 'ONE_TIME',
  date: '',
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '12:00',
  discountType: 'PERCENTAGE',
  discountValue: '20',
  isAllEmployees: true,
  isAllServices: true,
  employeeIds: [],
  serviceIds: [],
};

function HappyHourForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees-admin'],
    queryFn: employeesApi.getAll,
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const set = (field: keyof FormState, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleId = (field: 'employeeIds' | 'serviceIds', id: string) =>
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      type: form.type,
      date: form.type === 'ONE_TIME' ? form.date || null : null,
      dayOfWeek: form.type === 'RECURRING' ? form.dayOfWeek : null,
      startTime: form.startTime,
      endTime: form.endTime,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      isAllEmployees: form.isAllEmployees,
      isAllServices: form.isAllServices,
      employeeIds: form.isAllEmployees ? [] : form.employeeIds,
      serviceIds: form.isAllServices ? [] : form.serviceIds,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nazwa">
        <input
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="np. Środowe Happy Hours"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Typ">
        <div className="flex gap-2">
          {(['ONE_TIME', 'RECURRING'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`flex-1 py-2 rounded-lg text-sm border font-medium transition-all ${
                form.type === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {t === 'ONE_TIME' ? 'Jednorazowy' : 'Cykliczny'}
            </button>
          ))}
        </div>
      </Field>

      {form.type === 'ONE_TIME' ? (
        <Field label="Data">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      ) : (
        <Field label="Dzień tygodnia">
          <select
            value={form.dayOfWeek}
            onChange={(e) => set('dayOfWeek', Number(e.target.value))}
            className={INPUT_CLS}
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Godzina od">
          <input
            type="time"
            required
            value={form.startTime}
            onChange={(e) => set('startTime', e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Godzina do">
          <input
            type="time"
            required
            value={form.endTime}
            onChange={(e) => set('endTime', e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Typ rabatu">
          <select
            value={form.discountType}
            onChange={(e) => set('discountType', e.target.value as 'PERCENTAGE' | 'AMOUNT')}
            className={INPUT_CLS}
          >
            <option value="PERCENTAGE">Procentowy (%)</option>
            <option value="AMOUNT">Kwotowy (zł)</option>
          </select>
        </Field>
        <Field label="Wartość rabatu">
          <input
            type="number"
            required
            min={0}
            step={0.01}
            value={form.discountValue}
            onChange={(e) => set('discountValue', e.target.value)}
            className={INPUT_CLS}
          />
        </Field>
      </div>

      {/* Employees scope */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAllEmployees}
            onChange={(e) => set('isAllEmployees', e.target.checked)}
            className="rounded"
          />
          Wszyscy pracownicy
        </label>
        {!form.isAllEmployees && (
          <div className="border rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
            {employees.map((emp: any) => (
              <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.employeeIds.includes(emp.id)}
                  onChange={() => toggleId('employeeIds', emp.id)}
                  className="rounded"
                />
                {emp.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Services scope */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAllServices}
            onChange={(e) => set('isAllServices', e.target.checked)}
            className="rounded"
          />
          Wszystkie usługi
        </label>
        {!form.isAllServices && (
          <div className="border rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
            {services.map((svc: any) => (
              <label key={svc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.serviceIds.includes(svc.id)}
                  onChange={() => toggleId('serviceIds', svc.id)}
                  className="rounded"
                />
                {svc.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Zapisywanie...' : 'Dodaj Happy Hour'}
      </Button>
    </form>
  );
}

export function HappyHourModal({ onClose: _onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: happyHours = [], isLoading } = useQuery<any[]>({
    queryKey: ['happy-hours', 'all'],
    queryFn: happyHoursApi.getAll,
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: happyHoursApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['happy-hours'] });
      toast.success('Happy Hour dodany');
      setShowForm(false);
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: happyHoursApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['happy-hours'] });
      toast.success('Usunięto');
    },
    onError: () => toast.error('Błąd usuwania'),
  });

  const { mutate: toggle } = useMutation({
    mutationFn: happyHoursApi.toggle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['happy-hours'] }),
    onError: () => toast.error('Błąd'),
  });

  return (
    <div className="space-y-6">
      {/* List of existing happy hours */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground animate-pulse">Ładowanie...</div>
      ) : happyHours.length === 0 && !showForm ? (
        <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
          Brak Happy Hours. Dodaj pierwszy!
        </div>
      ) : (
        <div className="space-y-3">
          {happyHours.map((hh: any) => (
            <div
              key={hh.id}
              className="border rounded-xl p-3 flex items-start justify-between gap-3"
              style={
                hh.isActive
                  ? { borderColor: '#D97706', background: 'rgba(217,119,6,0.04)' }
                  : { opacity: 0.6 }
              }
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{hh.isActive ? '⭐' : '⏸'} {hh.name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: hh.isActive ? 'rgba(217,119,6,0.12)' : 'rgba(0,0,0,0.06)',
                      color: hh.isActive ? '#92400E' : '#6B7280',
                    }}
                  >
                    {hh.type === 'ONE_TIME' ? 'Jednorazowy' : 'Cykliczny'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hh.type === 'ONE_TIME'
                    ? `Data: ${hh.date ? new Date(hh.date).toLocaleDateString('pl-PL') : '—'}`
                    : `Dzień: ${DAY_NAMES[hh.dayOfWeek ?? 0]}`}
                  {' · '}
                  {hh.startTime}–{hh.endTime}
                  {' · '}
                  {hh.discountType === 'PERCENTAGE'
                    ? `-${hh.discountValue}%`
                    : `-${Number(hh.discountValue).toFixed(2)} zł`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggle(hh.id)}
                  title={hh.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  style={{ color: hh.isActive ? '#D97706' : '#9CA3AF' }}
                >
                  {hh.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Usunąć "${hh.name}"?`)) remove(hh.id);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-sm">Nowy Happy Hour</h3>
          <HappyHourForm onSubmit={(data) => create(data)} isPending={creating} />
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="w-full">
            Anuluj
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
          <Plus size={16} className="mr-1.5" /> Dodaj Happy Hour
        </Button>
      )}
    </div>
  );
}
