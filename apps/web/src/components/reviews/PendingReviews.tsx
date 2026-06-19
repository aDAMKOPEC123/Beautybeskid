// filepath: apps/web/src/components/reviews/PendingReviews.tsx
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/api/reviews.api';
import { ReviewForm } from './ReviewForm';
import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';

export const PendingReviews = () => {
  const { data: pending, isLoading } = useQuery({
    queryKey: ['reviews-pending'],
    queryFn: reviewsApi.getPending,
  });
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  if (isLoading) return null;

  if (!pending || pending.length === 0) {
    return (
      <div
        className="rounded-[18px] p-4"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquarePlus size={17} style={{ color: '#1A3828' }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Opinie
            </p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A3828', lineHeight: 1.2 }}>
              Brak wizyt do oceny
            </p>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.5)', lineHeight: 1.55 }}>
          Po każdej ukończonej wizycie możesz zostawić opinię i zdobyć +5 pkt lojalnościowych.
        </p>
      </div>
    );
  }

  const currentAppointment = pending.find((a) => a.id === reviewingId) || pending[0];

  if (reviewingId || pending.length > 0) {
    if (reviewingId) {
      return (
        <ReviewForm
          appointmentId={currentAppointment.id}
          serviceName={currentAppointment.service.name}
          employeeName={currentAppointment.employee?.name}
          date={currentAppointment.date}
          onDone={() => setReviewingId(null)}
        />
      );
    }
  }

  return (
    <div
      className="rounded-[20px] p-6"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <MessageSquarePlus size={20} style={{ color: '#C4965A' }} />
        <h2 className="font-heading font-bold text-lg" style={{ color: '#1A3828' }}>
          Oceń swoje wizyty
        </h2>
      </div>
      <p className="text-sm mb-4" style={{ color: 'rgba(20,40,28,0.55)' }}>
        Masz {pending.length} {pending.length === 1 ? 'wizytę' : 'wizyty'} do oceny. Za każdą opinię +5 pkt!
      </p>
      <div className="space-y-2">
        {pending.slice(0, 3).map((a) => (
          <button
            key={a.id}
            onClick={() => setReviewingId(a.id)}
            className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors hover:bg-[rgba(232,243,234,0.5)]"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div>
              <p className="font-medium text-sm" style={{ color: '#1A3828' }}>{a.service.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(20,40,28,0.5)' }}>
                {new Date(a.date).toLocaleDateString('pl-PL')}
              </p>
            </div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
            >
              Oceń
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
