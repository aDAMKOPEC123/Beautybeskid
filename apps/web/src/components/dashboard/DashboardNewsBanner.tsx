import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroApi, type HeroSlide, type SlideButton } from '@/api/hero.api';

// Renders a single CTA button from slide data.
// Internal hrefs (starting with '/') use React Router Link for SPA navigation.
// External hrefs open in a new tab.
const SlideButtonLink = ({ btn }: { btn: SlideButton }) => {
  const isInternal = btn.href.startsWith('/');
  const baseStyle: React.CSSProperties =
    btn.variant === 'default'
      ? { background: '#C4965A', color: '#fff' }
      : { border: '1px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)' };
  const className =
    'inline-flex min-h-10 items-center px-4 py-2 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase transition-opacity hover:opacity-80';

  if (isInternal) {
    return (
      <Link to={btn.href} className={className} style={baseStyle}>
        {btn.label}
      </Link>
    );
  }
  return (
    <a href={btn.href} target="_blank" rel="noopener noreferrer" className={className} style={baseStyle}>
      {btn.label}
    </a>
  );
};

const isPresentableSlide = (slide: HeroSlide) => {
  const heading = slide.heading?.trim() ?? '';
  const subtitle = slide.subtitle?.trim() ?? '';
  const mentionedYears = `${heading} ${subtitle}`.match(/20\d{2}/g)?.map(Number) ?? [];
  const isStale = mentionedYears.some((year) => year < new Date().getFullYear());
  const hasUsefulCopy = heading.length >= 6 || subtitle.length >= 16;
  const hasAction = Boolean(slide.buttons?.some((button) => button.label?.trim() && button.href?.trim()));
  return !isStale && (hasUsefulCopy || hasAction);
};

// Single slide layer — absolute positioned, fades in/out via opacity.
const SlideLayer = ({ slide, active }: { slide: HeroSlide; active: boolean }) => {
  const hasButtons = slide.buttons && slide.buttons.length > 0;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${slide.imagePath})` }}
      />
      {/* Gradient overlay — ensures text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      {/* Text content — bottom-left. Label always visible; heading/subtitle/buttons conditional. */}
      <div className="absolute inset-0 flex flex-col justify-end p-[14px_16px]">
        <p
          className="text-[10px] font-bold uppercase mb-1.5"
          style={{ color: '#C4965A', letterSpacing: '0.22em', fontFamily: 'sans-serif' }}
        >
          ✦ Nowości &amp; Aktualności
        </p>
        {slide.heading && (
          <p
            className="font-bold text-white leading-tight mb-1 text-sm md:text-base"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {slide.heading}
          </p>
        )}
        {slide.subtitle && (
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.76)', fontFamily: 'sans-serif' }}>
            {slide.subtitle}
          </p>
        )}
        {hasButtons && (
          <div className="flex flex-wrap gap-1.5">
            {slide.buttons?.map((btn, i) => (
              <SlideButtonLink key={i} btn={btn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DashboardNewsBanner = () => {
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['hero-slides'], // shared cache with HeroSlider + admin invalidations
    queryFn: heroApi.getSlides,
    staleTime: 5 * 60 * 1000,
  });
  const visibleSlides = slides.filter(isPresentableSlide);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // restartKey is incremented on dot click to reset the autoplay interval from zero
  const [restartKey, setRestartKey] = useState(0);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % visibleSlides.length);
    setRestartKey(k => k + 1);
  }, [visibleSlides.length]);
  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + visibleSlides.length) % visibleSlides.length);
    setRestartKey(k => k + 1);
  }, [visibleSlides.length]);

  // Clamp current index when slides list shrinks (e.g. admin removes a slide during session)
  useEffect(() => {
    setCurrent(c => (visibleSlides.length > 0 ? Math.min(c, visibleSlides.length - 1) : 0));
  }, [visibleSlides.length]);

  // Autoplay — cleared on unmount to prevent memory leaks.
  // restartKey in deps ensures the interval is reset from zero on dot click.
  useEffect(() => {
    if (visibleSlides.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [visibleSlides.length, paused, next, restartKey]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{ borderRadius: 18, border: '1.5px solid rgba(26,56,40,0.22)', background: '#fff', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(232,243,234,0.8)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A3828', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,56,40,0.68)' }}>Nowości</span>
        </div>
        <div className="w-full animate-pulse" style={{ height: '160px', background: 'rgba(0,0,0,0.08)' }} />
      </div>
    );
  }

  // Hidden when no active slides
  if (!visibleSlides.length) return null;

  const showNav = visibleSlides.length > 1;

  return (
    <div style={{ borderRadius: 18, border: '1.5px solid rgba(26,56,40,0.22)', background: '#fff', overflow: 'hidden' }}>
      {/* Nagłówek */}
      <div style={{ background: 'rgba(232,243,234,0.8)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1A3828', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,56,40,0.68)' }}>Nowości</span>
      </div>
      <section
        aria-label="Nowości i aktualności"
        className="relative w-full overflow-hidden"
        style={{ height: '160px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {visibleSlides.map((slide, i) => (
        <SlideLayer key={slide.id} slide={slide} active={i === current} />
      ))}

      {showNav && (
        <>
          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="Poprzedni slajd"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-colors hover:bg-white/20"
            style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <ChevronLeft size={14} className="text-white/80" />
          </button>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="Następny slajd"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-colors hover:bg-white/20"
            style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <ChevronRight size={14} className="text-white/80" />
          </button>

          {/* Dot indicators — vertical, right edge */}
          <div
            className="absolute flex flex-col"
            style={{ right: '36px', top: '50%', transform: 'translateY(-50%)', gap: '5px' }}
          >
            {visibleSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setRestartKey(k => k + 1); }}
                aria-label={`Przejdź do slajdu ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                className="pointer-events-auto rounded-full transition-colors"
                style={{
                  width: '6px',
                  height: '6px',
                  background: i === current ? '#C4965A' : 'rgba(255,255,255,0.28)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </>
      )}
      </section>
    </div>
  );
};
