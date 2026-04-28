// filepath: apps/web/src/components/reviews/ReviewForm.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/api/reviews.api';
import { StarRating } from './StarRating';
import { toast } from 'sonner';

interface ReviewFormProps {
  appointmentId: string;
  serviceName: string;
  employeeName?: string;
  date: string;
  onDone?: () => void;
}

export const ReviewForm = ({ appointmentId, serviceName, employeeName, date, onDone }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => reviewsApi.create({ appointmentId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      toast.success('Dziękujemy za opinię! +5 punktów lojalnościowych');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews-pending'] });
      onDone?.();
    },
    onError: () => toast.error('Nie udało się wysłać recenzji'),
  });

  return (
    <div
      className="rounded-[20px] p-6 text-center"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-lg"
        style={{ background: 'linear-gradient(135deg, #C4965A, #D99B68)' }}
      >
        {serviceName.charAt(0)}
      </div>
      <h3 className="font-heading font-bold text-xl mb-1" style={{ color: '#1A3828' }}>
        Jak oceniasz wizytę?
      </h3>
      <p className="text-sm mb-5" style={{ color: 'rgba(20,40,28,0.55)' }}>
        <strong style={{ color: '#1A3828' }}>{serviceName}</strong>
        {employeeName && <> · {employeeName}</>}
        {' · '}
        {new Date(date).toLocaleDateString('pl-PL')}
      </p>

      <div className="mb-5">
        <StarRating value={rating} onChange={setRating} size={40} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Podziel się swoją opinią (opcjonalnie)..."
        rows={3}
        className="w-full max-w-md mx-auto block rounded-xl p-3.5 text-sm outline-none transition-colors"
        style={{
          border: '1px solid #E8F3EA',
          background: '#F4F9F5',
          color: '#1A3828',
          fontFamily: 'inherit',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#C4965A')}
        onBlur={(e) => (e.target.style.borderColor = '#E8F3EA')}
      />

      <div className="flex items-center justify-center gap-3 mt-5">
        <button
          onClick={() => mutate()}
          disabled={rating === 0 || isPending}
          className="px-8 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#1A3828' }}
        >
          {isPending ? 'Wysyłanie...' : 'Wyślij opinię'}
        </button>
        {onDone && (
          <button
            onClick={onDone}
            className="px-6 py-2.5 rounded-full text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: '#5A7A62' }}
          >
            Pomiń
          </button>
        )}
      </div>

      <div
        className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
      >
        <Star size={12} fill="#C4965A" stroke="#C4965A" /> +5 punktów za recenzję
      </div>
    </div>
  );
};

function Star(props: { size: number; fill: string; stroke: string }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill={props.fill} stroke={props.stroke} strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
