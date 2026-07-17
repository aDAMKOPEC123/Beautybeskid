import React from 'react';
import { useClipReveal } from '@/hooks/useClipReveal';
import { cn } from '@/lib/utils';

interface ClipRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  delay?: number;
  objectFit?: 'cover' | 'contain';
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export const ClipRevealImage = ({
  src,
  alt,
  className,
  wrapperClassName,
  delay = 0,
  objectFit = 'cover',
  onError,
}: ClipRevealImageProps) => {
  const { ref, revealed } = useClipReveal<HTMLDivElement>({ delay });

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden', wrapperClassName)}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
      }}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full transition-transform duration-700',
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          className
        )}
        style={{
          transform: revealed ? 'scale(1)' : 'scale(1.02)',
          transition: 'transform 0.45s ease-out',
        }}
        onError={onError}
      />
    </div>
  );
};
