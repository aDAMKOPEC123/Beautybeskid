// filepath: apps/web/src/components/reviews/ReviewsList.tsx
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '@/api/reviews.api';
import { StarRating } from './StarRating';
import { CheckCircle } from 'lucide-react';

interface ReviewsListProps {
  serviceId: string;
}

export const ReviewsList = ({ serviceId }: ReviewsListProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'service', serviceId],
    queryFn: () => reviewsApi.getServiceReviews(serviceId),
    enabled: !!serviceId,
  });

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-xl p-5" style={{ background: 'rgba(232,243,234,0.5)' }}>
          <div className="h-4 w-32 rounded bg-[#E8F3EA] mb-2" />
          <div className="h-3 w-48 rounded bg-[#E8F3EA]" />
        </div>
      ))}
    </div>
  );

  if (!data || data.aggregate.count === 0) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'dzisiaj';
    if (days === 1) return 'wczoraj';
    if (days < 7) return `${days} dni temu`;
    if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
    if (days < 365) return `${Math.floor(days / 30)} mies. temu`;
    return `${Math.floor(days / 365)} lat temu`;
  };

  return (
    <div className="rounded-[20px] p-8" style={{ background: '#F0F7F1' }}>
      {/* Header with aggregate */}
      <div className="flex items-center gap-5 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <span className="text-5xl font-bold font-heading" style={{ color: '#1A3828' }}>
          {data.aggregate.avgRating.toFixed(1)}
        </span>
        <div>
          <StarRating value={Math.round(data.aggregate.avgRating)} readonly size={20} />
          <p className="text-sm mt-1" style={{ color: '#5A7A62' }}>
            na podstawie {data.aggregate.count} {data.aggregate.count === 1 ? 'opinii' : 'opinii'}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-0 divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {data.reviews.map((review) => (
          <div key={review.id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ background: 'linear-gradient(135deg, #E8BB94, #C4965A)' }}
                >
                  {review.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-sm" style={{ color: '#1A3828' }}>
                    {review.user.name}
                  </span>
                  <div className="mt-0.5">
                    <StarRating value={review.rating} readonly size={14} />
                  </div>
                </div>
              </div>
              <span className="text-xs" style={{ color: '#B0A89E' }}>
                {timeAgo(review.createdAt)}
              </span>
            </div>
            {review.comment && (
              <p className="text-sm mt-1" style={{ color: '#4A3E38' }}>
                "{review.comment}"
              </p>
            )}
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
              >
                <CheckCircle size={11} /> Zweryfikowana wizyta
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
