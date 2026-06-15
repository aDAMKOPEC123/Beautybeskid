import { StarRating } from './StarRating';

interface ServiceRatingProps {
  avgRating: number | null;
  reviewCount: number;
}

export const ServiceRating = ({ avgRating, reviewCount }: ServiceRatingProps) => {
  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={Math.round(avgRating ?? 0)} size={13} readonly />
      <span className="text-xs" style={{ color: 'rgba(20,40,28,0.45)' }}>
        {avgRating != null ? avgRating.toFixed(1) : '0.0'} ({reviewCount})
      </span>
    </div>
  );
};
