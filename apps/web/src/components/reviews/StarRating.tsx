// filepath: apps/web/src/components/reviews/StarRating.tsx
import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

export const StarRating = ({ value, onChange, size = 24, readonly = false }: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            size={size}
            fill={(hovered || value) >= star ? '#C4965A' : 'transparent'}
            stroke={(hovered || value) >= star ? '#C4965A' : '#D1C8BE'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
};
