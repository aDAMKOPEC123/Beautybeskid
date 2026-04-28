// filepath: apps/web/src/pages/admin/Reviews.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, Review } from '@/api/reviews.api';
import { StarRating } from '@/components/reviews/StarRating';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export const AdminReviews = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'admin', page],
    queryFn: () => reviewsApi.getAll(page, 20),
  });

  const toggleMutation = useMutation({
    mutationFn: reviewsApi.toggleVisibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Zmieniono widoczność recenzji');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
          Recenzje
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(20,40,28,0.55)' }}>
          Zarządzaj opiniami klientek
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl p-5 bg-white" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
              <div className="h-4 w-40 rounded bg-[#E8F3EA] mb-2" />
              <div className="h-3 w-64 rounded bg-[#E8F3EA]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reviews.map((review: Review) => (
            <div
              key={review.id}
              className={`rounded-[16px] p-5 flex items-start gap-4 ${!review.isVisible ? 'opacity-50' : ''}`}
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-sm" style={{ color: '#1A3828' }}>
                    {review.user.name}
                  </span>
                  <StarRating value={review.rating} readonly size={14} />
                  <span className="text-xs" style={{ color: '#B0A89E' }}>
                    {new Date(review.createdAt).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                <p className="text-xs mb-1" style={{ color: '#5A7A62' }}>
                  Usługa: <strong>{review.service?.name}</strong>
                </p>
                {review.comment && (
                  <p className="text-sm" style={{ color: '#4A3E38' }}>"{review.comment}"</p>
                )}
              </div>
              <button
                onClick={() => toggleMutation.mutate(review.id)}
                className="p-2 rounded-lg transition-colors hover:bg-[rgba(232,243,234,0.5)]"
                title={review.isVisible ? 'Ukryj recenzję' : 'Pokaż recenzję'}
              >
                {review.isVisible ? (
                  <Eye size={18} style={{ color: '#C4965A' }} />
                ) : (
                  <EyeOff size={18} style={{ color: '#B0A89E' }} />
                )}
              </button>
            </div>
          ))}

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: data.totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className="w-8 h-8 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background: page === i + 1 ? '#1A3828' : 'transparent',
                    color: page === i + 1 ? '#fff' : '#5A7A62',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
