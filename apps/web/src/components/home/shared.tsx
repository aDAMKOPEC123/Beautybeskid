import type { ReactNode } from 'react';
import { Star } from 'lucide-react';

export const FadeUp = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export const SectionIntro = ({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) => (
  <div className={align === 'center' ? 'mx-auto mb-7 max-w-3xl text-center sm:mb-10' : 'mb-7 max-w-2xl sm:mb-10'}>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-oak sm:mb-3 sm:text-xs sm:tracking-[0.18em]">{eyebrow}</p>
    <h2 className="font-heading text-2xl font-bold leading-tight text-espresso sm:text-3xl md:text-4xl">{title}</h2>
    {description && (
      <p className="mt-3 text-[15px] leading-relaxed text-espresso/75 sm:mt-4 sm:text-base md:text-lg">{description}</p>
    )}
  </div>
);

export const StarRow = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-1 text-oak" role="img" aria-label="Ocena 5 na 5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={compact ? 'h-3.5 w-3.5 fill-current' : 'h-4 w-4 fill-current'} />
    ))}
  </div>
);
