import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { X, Copy, Check, UserPlus } from 'lucide-react';
import { appointmentsApi } from '@/api/appointments.api';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  prefillDate?: string;
  prefillTime?: string;
  prefillEmployeeId?: string;
  employees: any[];
  services: any[];
}

type Step = 'form' | 'summary';

export function ExternalClientModal({
  ...props
}: Props) {
  if (!props.open) return null;
  return <ExternalClientModalContent {...props} />;
}

function ExternalClientModalContent({
  onClose,
  prefillDate,
  prefillTime,
  prefillEmployeeId,
  employees,
  services,
}: Props) {
  const defaultTimeFrom = prefillTime ?? '09:00';
  const defaultDate = prefillDate
    ? format(new Date(prefillDate), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const defaultService = services[0];
  const defaultDuration = defaultService?.durationMinutes ?? 60;
  const defaultTimeTo = (() => {
    const [h, m] = defaultTimeFrom.split(':').map(Number);
    const totalMins = h * 60 + m + defaultDuration;
    return `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
  })();

  const [step, setStep] = useState<Step>('form');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState({
    date: defaultDate,
    timeFrom: defaultTimeFrom,
    timeTo: defaultTimeTo,
    employeeId: prefillEmployeeId ?? employees[0]?.id ?? '',
    serviceId: defaultService?.id ?? '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // When service changes, update timeTo to respect new service duration
  const handleServiceChange = (serviceId: string) => {
    const svc = services.find((s: any) => s.id === serviceId);
    if (svc) {
      const [h, m] = form.timeFrom.split(':').map(Number);
      const totalMins = h * 60 + m + (svc.durationMinutes ?? 60);
      const newTimeTo = `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
      setForm((f) => ({ ...f, serviceId, timeTo: newTimeTo }));
    } else {
      set('serviceId', serviceId);
    }
  };

  // When timeFrom changes, shift timeTo by the same duration
  const handleTimeFromChange = (newTimeFrom: string) => {
    const [oh, om] = form.timeFrom.split(':').map(Number);
    const [th, tm] = form.timeTo.split(':').map(Number);
    const duration = (th * 60 + tm) - (oh * 60 + om);
    const [nh, nm] = newTimeFrom.split(':').map(Number);
    const newTotal = nh * 60 + nm + Math.max(duration, 15);
    const newTimeTo = `${String(Math.floor(newTotal / 60) % 24).padStart(2, '0')}:${String(newTotal % 60).padStart(2, '0')}`;
    setForm((f) => ({ ...f, timeFrom: newTimeFrom, timeTo: newTimeTo }));
  };

  const computedDuration = (() => {
    const [fh, fm] = form.timeFrom.split(':').map(Number);
    const [th, tm] = form.timeTo.split(':').map(Number);
    return Math.max((th * 60 + tm) - (fh * 60 + fm), 1);
  })();

  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const [h, m] = form.timeFrom.split(':').map(Number);
      const dateToUse = prefillDate ? new Date(prefillDate) : new Date(form.date);
      dateToUse.setHours(Number(h), Number(m), 0, 0);

      return appointmentsApi.createExternal({
        clientName: form.clientName,
        clientPhone: form.clientPhone || undefined,
        clientEmail: form.clientEmail || undefined,
        serviceId: form.serviceId,
        employeeId: form.employeeId || undefined,
        date: dateToUse.toISOString(),
        notes: form.notes || undefined,
        customDurationMinutes: computedDuration,
      });
    },
    onSuccess: (appt) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setResult(appt);
      setStep('summary');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(msg ?? 'Błąd podczas dodawania wizyty');
    },
  });

  const buildSummaryText = (appt: any) => {
    const apptDate = new Date(appt.date);
    const dateStr = format(apptDate, "EEEE, d MMMM yyyy", { locale: pl });
    const timeStr = format(apptDate, 'HH:mm');
    const employeeName = appt.employee?.name ?? 'Dowolny pracownik';
    const serviceName = appt.service?.name ?? '';
    const clientName = appt.user?.name ?? form.clientName;
    const phone = appt.user?.phone ?? form.clientPhone;

    return [
      `Potwierdzenie wizyty`,
      ``,
      `Klientka: ${clientName}`,
      ...(phone ? [`Telefon: ${phone}`] : []),
      ``,
      `Zabieg: ${serviceName}`,
      `Pracownik: ${employeeName}`,
      `Data: ${dateStr}`,
      `Godzina: ${timeStr}`,
      ...(appt.notes ? [``, `Notatki: ${appt.notes}`] : []),
    ].join('\n');
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(buildSummaryText(result)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setStep('form');
    setResult(null);
    setCopied(false);
    onClose();
  };

  const displayDate = prefillDate
    ? format(new Date(prefillDate), 'dd.MM.yyyy', { locale: pl })
    : form.date;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-violet-500" />
            <h2 className="font-heading font-bold text-lg">
              {step === 'form' ? 'Klientka z zewnątrz' : 'Wizyta dodana'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-accent">
            <X size={16} />
          </button>
        </div>

        {step === 'form' && (
          <>
            <p className="text-xs text-muted-foreground">
              Wizyta dla klientki spoza systemu — bez konta w aplikacji.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className={prefillDate ? 'col-span-2' : ''}>
                <label className="text-xs text-muted-foreground">Data</label>
                {prefillDate ? (
                  <input
                    readOnly
                    value={displayDate}
                    className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-muted"
                  />
                ) : (
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
              {!prefillDate && <div />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Godzina od</label>
                <input
                  type="time"
                  value={form.timeFrom}
                  onChange={(e) => handleTimeFromChange(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Godzina do <span className="text-violet-500">({computedDuration} min)</span>
                </label>
                <input
                  type="time"
                  value={form.timeTo}
                  onChange={(e) => set('timeTo', e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Pracownik *</label>
              <select
                value={form.employeeId}
                onChange={(e) => set('employeeId', e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— wybierz pracownika —</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Zabieg</label>
              <select
                value={form.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Imię i nazwisko klientki *</label>
              <input
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="np. Anna Kowalska"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Telefon (opcjonalny)</label>
                <input
                  value={form.clientPhone}
                  onChange={(e) => set('clientPhone', e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="+48 123 456 789"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email (opcjonalny)</label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => set('clientEmail', e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="anna@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Notatki</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Anuluj
              </Button>
              <Button
                size="sm"
                disabled={isPending || !form.clientName || !form.serviceId || !form.employeeId || computedDuration < 1}
                onClick={() => mutate()}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isPending ? 'Zapisuję...' : 'Dodaj wizytę'}
              </Button>
            </div>
          </>
        )}

        {step === 'summary' && result && (
          <>
            <div className="rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Klientka</span>
                  <span className="font-medium">{result.user?.name ?? form.clientName}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Telefon</span>
                  <span className="font-medium">{(result.user?.phone ?? form.clientPhone) || 'Brak'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Zabieg</span>
                  <span className="font-medium">{result.service?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Pracownik</span>
                  <span className="font-medium">{result.employee?.name ?? 'Dowolny'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Data</span>
                  <span className="font-medium capitalize">
                    {format(new Date(result.date), "EEEE, d MMM yyyy", { locale: pl })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Godzina</span>
                  <span className="font-medium">{format(new Date(result.date), 'HH:mm')}</span>
                </div>
              </div>
              {result.notes && (
                <div className="text-sm border-t border-violet-200 dark:border-violet-800 pt-2">
                  <span className="text-xs text-muted-foreground block">Notatki</span>
                  <span>{result.notes}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Treść do wysłania klientce (SMS / WhatsApp):
              </p>
              <textarea
                readOnly
                rows={result.notes ? 10 : 8}
                value={buildSummaryText(result)}
                className="w-full text-xs border border-input rounded-md px-3 py-2 bg-muted font-mono resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Zamknij
              </Button>
              <Button
                size="sm"
                onClick={handleCopy}
                className={
                  copied
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                }
              >
                {copied ? (
                  <>
                    <Check size={14} className="mr-1.5" />
                    Skopiowano
                  </>
                ) : (
                  <>
                    <Copy size={14} className="mr-1.5" />
                    Kopiuj
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
