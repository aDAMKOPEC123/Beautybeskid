import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { recommendedSlidesApi, RecommendedSlide } from '@/api/recommended-slides.api';

const AUTOPLAY_MS = 5000;

export const RecommendedSlider = () => {
  const { data: slides = [] } = useQuery({
    queryKey: ['recommended-slides'],
    queryFn: recommendedSlidesApi.getSlides,
    staleTime: 60_000,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = slides.length;

  useEffect(() => {
    setCurrent(0);
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % count);
    }, AUTOPLAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, count]);

  if (count === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          background: 'rgba(196,150,90,0.05)',
          border: '1px solid rgba(196,150,90,0.15)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,150,90,0.7)', marginBottom: 2 }}>
          Polecane zabiegi
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A3828', lineHeight: 1.3 }}>
          Odkryj nasze zabiegi
        </p>
        <p style={{ fontSize: 12, color: 'rgba(20,40,28,0.5)', lineHeight: 1.55 }}>
          Sprawdź pełną ofertę salonowych usług dopasowanych do Twoich potrzeb.
        </p>
        <Link
          to="/uslugi"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', borderRadius: 100,
            background: '#1A3828', color: '#fff',
            fontSize: 12, fontWeight: 600, textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
        >
          Zobacz ofertę
        </Link>
      </div>
    );
  }

  const slide: RecommendedSlide = slides[current];
  const slideCopy = /\b(teraz|natychmiast|idź|idz|musisz)\b/i.test(slide.description)
    ? 'Zabieg dobrany do aktualnych potrzeb Twojej skóry.'
    : slide.description;

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ aspectRatio: '16/9', maxHeight: '220px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image */}
      <img
        key={slide.id}
        src={slide.imagePath}
        alt={slide.service.name}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: '#C4965A' }}
          >
            ✨ Polecany zabieg
          </p>
          <h3 className="text-white font-bold text-[17px] leading-tight mb-1.5">
            {slide.service.name}
          </h3>
          <p className="text-white/80 text-[12px] leading-relaxed line-clamp-2">
            {slideCopy}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-bold" style={{ color: '#C4965A' }}>
              od {Number(slide.service.price).toFixed(0)} zł
            </span>
            <Link
              to={`/rezerwacja?service=${slide.service.slug}`}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: '#C4965A', color: '#1A3828' }}
            >
              Zarezerwuj →
            </Link>
          </div>

          {/* Dots */}
          {count > 1 && (
            <div className="flex gap-1.5 items-center">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Pokaż polecany zabieg ${i + 1}`}
                  className="flex h-8 w-8 items-center justify-center transition-all"
                  style={{
                    background: 'transparent',
                  }}
                >
                  <span aria-hidden style={{ width: i === current ? 16 : 6, height: 4, borderRadius: 2, background: i === current ? '#C4965A' : 'rgba(255,255,255,0.55)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prev/Next arrows — only when multiple slides */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Poprzedni polecany zabieg"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 text-white flex items-center justify-center hover:bg-black/55 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            aria-label="Następny polecany zabieg"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 text-white flex items-center justify-center hover:bg-black/55 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </>
      )}
    </div>
  );
};
