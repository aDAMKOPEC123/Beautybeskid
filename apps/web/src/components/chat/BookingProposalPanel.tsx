import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarClock, X, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { servicesApi } from '@/api/services.api';
import { employeesApi } from '@/api/employees.api';

interface BookingProposalPanelProps {
  onSend: (message: string) => void;
  onClose: () => void;
}

export function BookingProposalPanel({ onSend, onClose }: BookingProposalPanelProps) {
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const { data: slots = [] } = useQuery<{ time: string; available: boolean }[]>({
    queryKey: ['availability', date, serviceId, employeeId],
    queryFn: () => employeesApi.getAvailability(date, serviceId, employeeId || null),
    enabled: !!date && !!serviceId,
  });

  const availableSlots = slots.filter((s) => s.available);

  const buildLink = () => {
    if (!serviceId || !date || !time) return null;
    const params = new URLSearchParams({ serviceId, date, time });
    if (employeeId) params.set('employeeId', employeeId);
    return `${window.location.origin}/rezerwacja?${params.toString()}`;
  };

  const link = buildLink();
  const selectedService = services.find((s: any) => s.id === serviceId);
  const selectedEmployee = employees.find((e: any) => e.id === employeeId);

  const handleSend = () => {
    if (!link) return;
    const empPart = selectedEmployee ? ` u ${selectedEmployee.name}` : '';
    const message = `Zarezerwuj wizytę: ${selectedService?.name}${empPart} — ${format(new Date(date), 'dd.MM.yyyy')} o ${time}\n${link}`;
    onSend(message);
    onClose();
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success('Link skopiowany!');
  };

  return (
    <div className="rounded-xl border bg-background shadow-lg p-4 space-y-3 overflow-y-auto max-h-[60vh]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#1A3828' }}>
          <CalendarClock size={16} style={{ color: '#C4965A' }} />
          Propozycja terminu
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      {/* Service */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Usługa</label>
        <select
          value={serviceId}
          onChange={(e) => { setServiceId(e.target.value); setTime(''); }}
          className="mt-0.5 w-full text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Wybierz usługę...</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Employee (optional) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Pracownik (opcjonalnie)</label>
        <select
          value={employeeId}
          onChange={(e) => { setEmployeeId(e.target.value); setTime(''); }}
          className="mt-0.5 w-full text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Dowolny pracownik</option>
          {employees.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Data</label>
        <input
          type="date"
          value={date}
          min={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => { setDate(e.target.value); setTime(''); }}
          className="mt-0.5 w-full text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Time slots */}
      {date && serviceId && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Godzina {availableSlots.length > 0 ? `(${availableSlots.length} wolnych)` : ''}
          </label>
          {availableSlots.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {slots.length === 0 ? 'Ładowanie slotów...' : 'Brak wolnych terminów w tym dniu'}
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {availableSlots.map((s) => (
                <button
                  key={s.time}
                  onClick={() => setTime(s.time)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                  style={
                    time === s.time
                      ? { background: '#1A3828', color: '#fff', borderColor: '#1A3828' }
                      : { borderColor: 'rgba(0,0,0,0.12)', color: '#1A3828' }
                  }
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {link && (
        <div
          className="rounded-lg p-2.5 text-xs break-all"
          style={{ background: 'rgba(196,150,90,0.08)', color: '#8C6040', border: '1px solid rgba(196,150,90,0.2)' }}
        >
          {link}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCopy}
          disabled={!link}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-accent transition-colors"
        >
          <Copy size={13} />
          Kopiuj link
        </button>
        <button
          onClick={handleSend}
          disabled={!link}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
          style={{ background: '#1A3828', color: '#fff' }}
        >
          <Send size={13} />
          Wyślij w czacie
        </button>
      </div>
    </div>
  );
}
