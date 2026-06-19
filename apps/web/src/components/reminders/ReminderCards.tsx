// filepath: apps/web/src/components/reminders/ReminderCards.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock3, Layers3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { remindersApi, type Reminder, type SeriesReminder } from '@/api/reminders.api';

const urgencyStyles = {
  overdue: {
    bg: 'rgba(239,68,68,0.1)',
    color: '#dc2626',
    label: (days: number) => `${Math.abs(days)} dni po terminie`,
  },
  due_soon: {
    bg: 'rgba(245,158,11,0.1)',
    color: '#d97706',
    label: (days: number) => (days === 0 ? 'Dzisiaj' : `Za ${days} dni`),
  },
  upcoming: {
    bg: 'rgba(196,150,90,0.12)',
    color: '#C4965A',
    label: (days: number) => `Za ${days} dni`,
  },
};

const buildBookingHref = (reminder: Reminder) => {
  const params = new URLSearchParams({ serviceId: reminder.bookingTarget.serviceId });
  if (reminder.kind === 'series' && reminder.bookingTarget.seriesId) {
    params.set('seriesId', reminder.bookingTarget.seriesId);
  }
  return `/rezerwacja?${params.toString()}`;
};

const getSeriesSummary = (reminder: SeriesReminder) => {
  if (reminder.nextAppointment) {
    return `Etap ${reminder.nextAppointment.step}/${reminder.totalVisits} jest juz umowiony na ${new Date(
      reminder.nextAppointment.date,
    ).toLocaleDateString('pl-PL')}.`;
  }

  if (reminder.daysUntilDue === null || reminder.urgency === null) {
    return `Postep serii: ${reminder.completedVisits}/${reminder.totalVisits}.`;
  }

  return `Etap ${reminder.nextStep}/${reminder.totalVisits}. Zalecany termin ${urgencyStyles[
    reminder.urgency
  ].label(reminder.daysUntilDue).toLowerCase()}.`;
};

export const ReminderCards = () => {
  const navigate = useNavigate();
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders', 'me'],
    queryFn: remindersApi.getMy,
  });

  if (isLoading) return null;

  if (reminders.length === 0) {
    return (
      <div
        className="rounded-[18px] p-4"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(26,56,40,0.06)' }}
          >
            <CalendarClock size={17} style={{ color: '#1A3828' }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Wizyty cykliczne
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A3828', lineHeight: 1.2 }}>
              Brak aktywnych serii
            </p>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.5)', lineHeight: 1.55, marginBottom: '12px' }}>
          Niektóre zabiegi wymagają serii wizyt. Kosmetolożka może ustawić dla Ciebie plan cykliczny.
        </p>
        <Link
          to="/rezerwacja"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', borderRadius: 100,
            background: '#1A3828', color: '#fff',
            fontSize: '12px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Umów wizytę
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] p-6"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
    >
      <h2 className="font-heading font-bold text-lg mb-1" style={{ color: '#1A3828' }}>
        Kolejne zabiegi
      </h2>
      <p className="text-sm mb-4" style={{ color: 'rgba(20,40,28,0.55)' }}>
        Serie wielowizytowe i przypomnienia o kolejnych terminach
      </p>

      <div className="space-y-3">
        {reminders.slice(0, 3).map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            onBook={() => navigate(buildBookingHref(reminder))}
            onOpenAppointment={() => navigate('/user/wizyty')}
          />
        ))}
      </div>
    </div>
  );
};

const ReminderCard = ({
  reminder,
  onBook,
  onOpenAppointment,
}: {
  reminder: Reminder;
  onBook: () => void;
  onOpenAppointment: () => void;
}) => {
  if (reminder.kind === 'series') {
    const style =
      reminder.urgency === null
        ? { bg: 'rgba(20,40,28,0.06)', color: '#1A3828', label: () => 'W toku' }
        : urgencyStyles[reminder.urgency];

    return (
      <div
        className="p-4 rounded-xl space-y-3"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: style.bg }}
          >
            {reminder.nextAppointment ? (
              <CheckCircle2 size={20} style={{ color: '#15803D' }} />
            ) : (
              <Layers3 size={20} style={{ color: style.color }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm leading-snug" style={{ color: '#1A3828' }}>
                {reminder.serviceName}
              </h4>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: 'rgba(196,150,90,0.1)', color: '#8C6040' }}
              >
                {reminder.completedVisits}/{reminder.totalVisits} etapów
              </span>
            </div>

            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#5A7A62' }}>
              {getSeriesSummary(reminder)}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {reminder.urgency !== null && reminder.daysUntilDue !== null && !reminder.nextAppointment && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: style.bg, color: style.color }}
                >
                  <Clock3 size={11} />
                  {style.label(reminder.daysUntilDue)}
                </span>
              )}
              {reminder.nextAppointment && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#15803D' }}
                >
                  <CalendarClock size={11} />
                  {new Date(reminder.nextAppointment.date).toLocaleString('pl-PL')}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={reminder.nextAppointment ? onOpenAppointment : onBook}
          className="w-full py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
          style={
            reminder.nextAppointment
              ? { background: 'transparent', color: '#1A3828', border: '1px solid rgba(26,56,40,0.2)' }
              : { background: '#1A3828', color: '#fff' }
          }
        >
          {reminder.nextAppointment ? 'Zobacz wizytę' : 'Umów się teraz'}
        </button>
      </div>
    );
  }

  const style = urgencyStyles[reminder.urgency];

  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: style.bg }}
        >
          <Clock3 size={20} style={{ color: style.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-snug" style={{ color: '#1A3828' }}>
            {reminder.serviceName}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: '#5A7A62' }}>
            Ostatnia wizyta: {new Date(reminder.lastVisitDate).toLocaleDateString('pl-PL')}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[12px] font-semibold"
              style={{
                color: '#C4965A',
                borderBottom: '2px solid rgba(196,150,90,0.4)',
                paddingBottom: '1px',
              }}
            >
              Cykl co {reminder.recommendedIntervalDays} dni
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: style.bg, color: style.color }}
            >
              <Clock3 size={11} />
              {style.label(reminder.daysUntilDue)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onBook}
        className="w-full py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
        style={{ background: '#1A3828', color: '#fff' }}
      >
        Umów się teraz
      </button>
    </div>
  );
};
