import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appointmentsApi, type FollowUpReminder } from '@/api/appointments.api';

const DISMISS_PREFIX = 'cosmo-reminder-dismissed-';

function isDismissed(serviceId: string): boolean {
  return !!sessionStorage.getItem(`${DISMISS_PREFIX}${serviceId}`);
}

function dismiss(serviceId: string): void {
  sessionStorage.setItem(`${DISMISS_PREFIX}${serviceId}`, '1');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

export const FollowUpReminderWidget = () => {
  const [dismissed, setDismissed] = useState<Set<string>>(
    () => new Set()
  );

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
    <div className="space-y-3 mb-6">
      {visible.map((r: FollowUpReminder) => (
        <div
          key={r.serviceId}
          className="flex items-start justify-between gap-4 p-4 rounded-2xl border"
          style={{ backgroundColor: '#F4F9F5', borderColor: 'rgba(196,150,90,0.3)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: '#1A3828' }}>
              Czas na odnowienie — {r.serviceName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(20,40,28,0.55)' }}>
              {r.daysOverdue > 0
                ? `${r.daysOverdue} dni po zalecanym terminie (${formatDate(r.recommendedReturnDate)})`
                : `Zalecany termin: ${formatDate(r.recommendedReturnDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={`/rezerwacja?serviceId=${r.serviceId}`}>
              <Button
                size="sm"
                className="rounded-full text-xs font-semibold"
                style={{ backgroundColor: '#1A3828', color: '#fff' }}
              >
                Zarezerwuj →
              </Button>
            </Link>
            <button
              onClick={() => handleDismiss(r.serviceId)}
              className="p-1 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Zamknij"
            >
              <X size={14} style={{ color: 'rgba(20,40,28,0.4)' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
