import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, type FollowUpReminder } from '@/api/appointments.api';

const DISMISS_PREFIX = 'cosmo-reminder-dismissed-';

function isDismissed(serviceId: string): boolean {
  return !!sessionStorage.getItem(`${DISMISS_PREFIX}${serviceId}`);
}

function dismiss(serviceId: string): void {
  sessionStorage.setItem(`${DISMISS_PREFIX}${serviceId}`, '1');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const FollowUpReminderWidget = () => {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const { data: reminders = [] } = useQuery({
    queryKey: ['follow-up-reminders'],
    queryFn: appointmentsApi.getFollowUpReminders,
    staleTime: 10 * 60_000,
  });

  const visible = reminders
    .filter((r) => !isDismissed(r.serviceId) && !dismissed.has(r.serviceId))
    .slice(0, 3);

  if (visible.length === 0) return null;

  const handleDismiss = (serviceId: string) => {
    dismiss(serviceId);
    setDismissed((prev) => new Set([...prev, serviceId]));
  };

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <div
          className="w-0.5 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: '#C4965A' }}
        />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#1A3828', letterSpacing: '0.12em' }}
        >
          Serie zabiegowe
        </span>
      </div>

      <div className="space-y-3">
        {visible.map((r: FollowUpReminder) => (
          <div
            key={r.serviceId}
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: '#F4F9F5', borderColor: 'rgba(196,150,90,0.25)' }}
          >
            {/* Gold top bar for overdue, subtle for upcoming */}
            <div
              className="h-0.5 w-full"
              style={{
                backgroundColor: r.daysOverdue > 0
                  ? 'rgba(196,150,90,0.8)'
                  : 'rgba(196,150,90,0.3)',
              }}
            />

            <div className="p-4">
              {/* Service name */}
              <p
                className="font-semibold text-sm leading-snug"
                style={{ color: '#1A3828' }}
              >
                {r.serviceName}
              </p>

              {/* Human-readable message */}
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: 'rgba(20,40,28,0.65)' }}
              >
                Aby kontynuować Twoją serię zabiegową, umów się na kolejną wizytę.
              </p>

              {/* Date info */}
              <p
                className="text-xs mt-1 font-medium"
                style={{
                  color: r.daysOverdue > 0 ? '#A0541E' : 'rgba(20,40,28,0.5)',
                }}
              >
                {r.daysOverdue > 0
                  ? `${r.daysOverdue} dni po zalecanym terminie · ${formatDate(r.recommendedReturnDate)}`
                  : `Zalecany termin: ${formatDate(r.recommendedReturnDate)}`}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between mt-3 gap-2">
                <Link
                  to={`/rezerwacja?serviceId=${r.serviceId}`}
                  className="flex-1"
                >
                  <button
                    className="w-full rounded-xl py-2 px-4 text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-75"
                    style={{ backgroundColor: '#1A3828', color: '#fff' }}
                  >
                    Umów wizytę
                  </button>
                </Link>
                <button
                  onClick={() => handleDismiss(r.serviceId)}
                  className="text-xs px-3 py-2 rounded-xl transition-colors hover:bg-black/5 flex-shrink-0"
                  style={{ color: 'rgba(20,40,28,0.4)' }}
                >
                  Pomiń
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
