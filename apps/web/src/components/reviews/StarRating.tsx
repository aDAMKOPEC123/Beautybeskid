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
  const displayedValue = hovered || value;

  if (readonly) {
    return (
      <div className="inline-flex gap-1" role="img" aria-label={`Ocena ${value} na 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} aria-hidden="true">
            <Star
              size={size}
              fill={value >= star ? '#C4965A' : 'transparent'}
              stroke={value >= star ? '#C4965A' : '#D1C8BE'}
              strokeWidth={1.5}
            />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex gap-1" role="group" aria-label="Wybierz ocenę">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Oceń na ${star} z 5`}
          aria-pressed={value === star}
          className="cursor-pointer rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            size={size}
            fill={displayedValue >= star ? '#C4965A' : 'transparent'}
            stroke={displayedValue >= star ? '#C4965A' : '#D1C8BE'}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
};
