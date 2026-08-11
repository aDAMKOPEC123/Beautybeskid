import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BellRing, Check, Clock3, UserRound, X } from 'lucide-react';
import type { Appointment } from '@cosmo/shared';

type TrackState = 'done' | 'current' | 'upcoming';

const TRACK_DOT: Record<TrackState, { background: string; color: string; border: string }> = {
  done: { background: '#1A3828', color: '#FFFFFF', border: '1px solid #1A3828' },
  current: { background: '#FFFFFF', color: '#7A4F1D', border: '2px solid #C4965A' },
  upcoming: { background: '#FFFFFF', color: 'rgba(20,40,28,0.35)', border: '1px solid rgba(26,56,40,0.18)' },
};

function TrackStep({
  state,
  icon,
  title,
  description,
  last = false,
}: {
  state: TrackState;
  icon: ReactNode;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-8 bottom-1 w-px"
          style={{ background: state === 'done' ? 'rgba(26,56,40,0.28)' : 'rgba(26,56,40,0.12)' }}
        />
      )}
      <span className="relative shrink-0">
        {state === 'current' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full motion-safe:animate-ping"
            style={{ background: 'rgba(196,150,90,0.35)' }}
          />
        )}
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full"
          style={TRACK_DOT[state]}
        >
          {state === 'done' ? <Check size={16} strokeWidth={3} /> : icon}
        </span>
      </span>
      <div className="min-w-0 pt-0.5">
        <p
          className="text-sm font-bold"
          style={{ color: state === 'upcoming' ? 'rgba(20,40,28,0.55)' : '#1A3828' }}
        >
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-5" style={{ color: 'rgba(20,40,28,0.62)' }}>
          {description}
        </p>
      </div>
    </li>
  );
}

export function BookingConfirmationPanel({
  appointment,
  onDismiss,
}: {
  appointment: Appointment;
  onDismiss: () => void;
}) {
  const isConfirmed = appointment.status === 'CONFIRMED';
  const date = new Date(appointment.date);

  return (
    <section
      aria-labelledby="booking-confirmation-heading"
      className="overflow-hidden rounded-[24px] border bg-white animate-enter"
      style={{
        borderColor: isConfirmed ? 'rgba(20,108,53,0.28)' : 'rgba(196,150,90,0.45)',
        boxShadow: '0 14px 40px rgba(26,56,40,0.10)',
      }}
    >
      <div className="h-1.5" style={{ background: isConfirmed ? '#146C35' : '#C4965A' }} />

      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#7A4F1D' }}>
              {isConfirmed ? 'Termin potwierdzony' : 'Rezerwacja przyjęta'}
            </p>
            <h2
              id="booking-confirmation-heading"
              className="mt-1.5 font-heading text-2xl font-bold leading-tight sm:text-[28px]"
              style={{ color: '#1A3828' }}
            >
              {isConfirmed ? 'Wizyta potwierdzona' : 'Twoja wizyta czeka na potwierdzenie'}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'rgba(20,40,28,0.76)' }}>
              {isConfirmed
                ? 'Salon zarezerwował dla Ciebie ten termin. Do zobaczenia!'
                : 'Salon sprawdza wybrany termin. Gdy wizyta zostanie potwierdzona, otrzymasz powiadomienie — nie musisz nic robić.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Zamknij potwierdzenie rezerwacji"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{ color: 'rgba(20,40,28,0.5)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="mt-5 rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(26,56,40,0.05)' }}
        >
          <p className="font-heading text-lg font-bold" style={{ color: '#1A3828' }}>
            {appointment.service.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: 'rgba(20,40,28,0.76)' }}>
            <span className="font-semibold capitalize" style={{ color: '#1A3828' }}>
              {format(date, 'EEEE, d MMMM', { locale: pl })}, {format(date, 'HH:mm')}
            </span>
            {appointment.employee?.name && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={15} /> {appointment.employee.name}
              </span>
            )}
          </div>
        </div>

        <ol className="mt-6">
          <TrackStep
            state="done"
            icon={<Check size={16} strokeWidth={3} />}
            title="Rezerwacja wysłana"
            description="Termin jest zapisany na Twoim koncie."
          />
          <TrackStep
            state={isConfirmed ? 'done' : 'current'}
            icon={<Clock3 size={16} />}
            title={isConfirmed ? 'Salon potwierdził termin' : 'Salon potwierdza termin'}
            description={
              isConfirmed
                ? 'Wizyta ma status „Potwierdzona”.'
                : 'Status wizyty to teraz „Oczekująca”. Znajdziesz ją na liście poniżej.'
            }
          />
          <TrackStep
            state={isConfirmed ? 'done' : 'upcoming'}
            icon={<BellRing size={15} />}
            title={isConfirmed ? 'Powiadomienie wysłane' : 'Dostaniesz powiadomienie'}
            description="Damy Ci znać w aplikacji i powiadomieniem push, gdy tylko salon potwierdzi termin."
            last
          />
        </ol>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 min-h-11 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A3828', color: '#fff' }}
        >
          Rozumiem
        </button>
      </div>
    </section>
  );
}
