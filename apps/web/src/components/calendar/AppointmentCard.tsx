import { EventContentArg } from '@fullcalendar/core';
import { cn } from '@/lib/utils';
import { cardDensity } from './cardDensity';

// Kolory statusów pochodzą z custom properties zdefiniowanych w calendar.css —
// jedno źródło wspólne z legendą, więc próbka w legendzie nigdy nie rozjedzie
// się z kaflem na siatce.
const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  PENDING: { background: 'var(--cal-status-pending)', color: '#fff' },
  CONFIRMED: { background: 'var(--cal-status-confirmed)', color: '#fff' },
  COMPLETED: { background: 'var(--cal-status-completed)', color: '#fff' },
  CANCELLED: { background: 'var(--cal-status-cancelled-bg)', color: 'var(--cal-status-cancelled-text)' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface AppointmentEventProps {
  clientName: string;
  serviceName: string;
  price: number;
  discountPercent?: number;
  status: string;
  employeeInitials?: string;
  employeeColor?: string;
  hasAllergies: boolean;
  hasNotes: boolean;
  phone?: string;
}

export function AppointmentCard({ event }: EventContentArg) {
  const props = event.extendedProps as AppointmentEventProps;

  const priceLabel = props.discountPercent
    ? `${props.price} zł (–${props.discountPercent}%)`
    : `${props.price} zł`;

  const fmt = (d: Date) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const startLabel = event.start ? fmt(event.start) : '';
  const timeRange = event.start && event.end
    ? `${fmt(event.start)} – ${fmt(event.end)}`
    : startLabel;

  const durationMinutes = event.start && event.end
    ? (event.end.getTime() - event.start.getTime()) / 60_000
    : 0;
  const density = cardDensity(durationMinutes);

  const style = STATUS_STYLE[props.status] ?? { background: 'var(--cal-status-completed)', color: '#fff' };
  const isUpcoming = props.status === 'CONFIRMED' || props.status === 'PENDING';
  const isCancelled = props.status === 'CANCELLED';

  // Ikony ostrzegawcze towarzyszą wizycie w każdej gęstości — to sygnały
  // bezpieczeństwa klientki, nie ozdoba, więc nigdy nie wypadają przez brak miejsca.
  const warnings = (
    <>
      {props.hasAllergies && <span title="Alergie">⚠️</span>}
      {props.hasNotes && <span title="Notatki">📝</span>}
    </>
  );

  return (
    <div
      className={cn(
        'h-full overflow-hidden rounded px-1.5 py-1 text-[11px] leading-snug',
        isUpcoming && 'border-l-[3px] border-l-caramel',
        isCancelled && 'line-through opacity-75',
      )}
      style={style}
    >
      {density === 'full' ? (
        <>
          <div className="opacity-80">{timeRange}</div>
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold">{props.clientName}</span>
            {warnings}
          </div>
          <div className="truncate opacity-90">{props.serviceName}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="opacity-80">{priceLabel}</span>
            <span className="rounded bg-white/20 px-1 text-[9px]">
              {STATUS_LABELS[props.status] ?? props.status}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            {props.employeeInitials && (
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ background: props.employeeColor ?? '#6366f1' }}
              >
                {props.employeeInitials}
              </span>
            )}
            {props.phone && <span className="truncate opacity-70">{props.phone}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <span className="shrink-0 font-semibold">{startLabel}</span>
            <span className="truncate">{props.clientName}</span>
            <span className="ml-auto flex shrink-0 items-center gap-0.5">{warnings}</span>
          </div>
          {density === 'medium' && (
            <div className="truncate opacity-90">{props.serviceName}</div>
          )}
        </>
      )}
    </div>
  );
}
