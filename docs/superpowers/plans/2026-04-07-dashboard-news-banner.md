# DashboardNewsBanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 160px filmowy slider baner tuż pod sekcją powitalną w dashboardzie użytkownika (`/user`), wyświetlający te same aktywne slajdy co publiczny hero slider.

**Architecture:** Nowy izolowany komponent `DashboardNewsBanner` z własnym `useQuery(['hero-slides'])` — reużywa istniejącego cache z `HeroSlider`. Wstawiony w `Dashboard.tsx` między sekcją powitalną a welcome couponem. Brak zmian w backendzie, `HeroSlider.tsx` ani `UserLayout.tsx`.

**Tech Stack:** React 19, TypeScript, @tanstack/react-query, react-router-dom `<Link>`, lucide-react (`ChevronLeft`, `ChevronRight`), Tailwind CSS + inline styles

---

## Files

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/components/dashboard/DashboardNewsBanner.tsx` | Cały komponent banera: pobieranie danych, autoplay, nawigacja, renderowanie |
| **Modify** | `apps/web/src/pages/user/Dashboard.tsx` | Import + pojedyncza linia wstawienia `<DashboardNewsBanner />` |

---

## Task 1: Create `DashboardNewsBanner` component

**Files:**
- Create: `apps/web/src/components/dashboard/DashboardNewsBanner.tsx`

- [ ] **Step 1.1: Create the component file**

Najpierw utwórz katalog (jeśli nie istnieje):

```bash
mkdir -p cosmo-app/apps/web/src/components/dashboard
```

Następnie utwórz plik `apps/web/src/components/dashboard/DashboardNewsBanner.tsx` z poniższą treścią:

```tsx
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
      ? { background: '#B8913A', color: '#fff' }
      : { border: '1px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)' };
  const className =
    'px-4 py-2 rounded-full text-[9px] font-bold tracking-[0.08em] uppercase transition-opacity hover:opacity-80';

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

// Single slide layer — absolute positioned, fades in/out via opacity.
const SlideLayer = ({ slide, active }: { slide: HeroSlide; active: boolean }) => {
  const hasText = slide.heading || slide.subtitle;
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
      {/* Text content — bottom-left */}
      {(hasText || hasButtons) && (
        <div className="absolute inset-0 flex flex-col justify-end p-[14px_16px]">
          <p
            className="text-[8px] font-bold uppercase mb-1"
            style={{ color: '#B8913A', letterSpacing: '0.22em', fontFamily: 'sans-serif' }}
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
            <p className="text-[9px] mb-2.5" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif' }}>
              {slide.subtitle}
            </p>
          )}
          {hasButtons && (
            <div className="flex flex-wrap gap-1.5">
              {slide.buttons!.map((btn, i) => (
                <SlideButtonLink key={i} btn={btn} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DashboardNewsBanner = () => {
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['hero-slides'], // shared cache with HeroSlider + admin invalidations
    queryFn: heroApi.getSlides,
    staleTime: 5 * 60 * 1000,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // restartKey is incremented on dot click to reset the autoplay interval from zero
  const [restartKey, setRestartKey] = useState(0);

  const next = useCallback(
    () => setCurrent(c => (c + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setCurrent(c => (c - 1 + slides.length) % slides.length),
    [slides.length],
  );

  // Clamp current index when slides list shrinks (e.g. admin removes a slide during session)
  useEffect(() => {
    setCurrent(c => (slides.length > 0 ? Math.min(c, slides.length - 1) : 0));
  }, [slides.length]);

  // Autoplay — cleared on unmount to prevent memory leaks.
  // restartKey in deps ensures the interval is reset from zero on dot click.
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [slides.length, paused, next, restartKey]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="w-full animate-pulse rounded-none"
        style={{ height: '160px', background: 'rgba(0,0,0,0.08)' }}
      />
    );
  }

  // Hidden when no active slides
  if (!slides.length) return null;

  const showNav = slides.length > 1;

  return (
    <section
      aria-label="Nowości i aktualności"
      className="relative w-full overflow-hidden"
      style={{ height: '160px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-[5px] pointer-events-none">
            {/* Invisible spacer so dots don't overlap arrows */}
          </div>
          <div
            className="absolute flex flex-col"
            style={{ right: '36px', top: '50%', transform: 'translateY(-50%)', gap: '5px' }}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setRestartKey(k => k + 1); }}
                aria-label={`Przejdź do slajdu ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                className="pointer-events-auto rounded-full transition-colors"
                style={{
                  width: '6px',
                  height: '6px',
                  background: i === current ? '#B8913A' : 'rgba(255,255,255,0.28)',
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
  );
};
```

- [ ] **Step 1.2: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: no errors. If errors appear, fix them before continuing.

- [ ] **Step 1.3: Commit the new component**

```bash
cd cosmo-app
git add apps/web/src/components/dashboard/DashboardNewsBanner.tsx
git commit -m "feat: add DashboardNewsBanner component"
```

---

## Task 2: Integrate into Dashboard.tsx

**Files:**
- Modify: `apps/web/src/pages/user/Dashboard.tsx`

- [ ] **Step 2.1: Add import at the top of Dashboard.tsx**

W pliku `apps/web/src/pages/user/Dashboard.tsx` dodaj import po ostatnim istniejącym imporcie komponentu (np. po linii z `usePushSubscription`):

```tsx
import { DashboardNewsBanner } from '@/components/dashboard/DashboardNewsBanner';
```

- [ ] **Step 2.2: Insert component between hero strip and welcome coupon**

Znajdź ten fragment w `Dashboard.tsx` (koniec sekcji Section 1, ok. linia 97–99):

```tsx
      </div>

      {/* Welcome coupon (shown above quick chips if present) */}
```

Zastąp go:

```tsx
      </div>

      <DashboardNewsBanner />

      {/* Welcome coupon (shown above quick chips if present) */}
```

- [ ] **Step 2.3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.4: Commit the integration**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Dashboard.tsx
git commit -m "feat: show DashboardNewsBanner in user dashboard"
```

---

## Task 3: Manual verification

Uruchom dev server i zweryfikuj wszystkie punkty:

- [ ] **Step 3.1: Start dev server**

```bash
cd cosmo-app && pnpm dev
```

- [ ] **Step 3.2: Weryfikacja podstawowa**

1. Zaloguj się jako zwykły użytkownik, wejdź na `/user`
2. Potwierdź że baner pojawia się **pod** sekcją powitalną i **nad** welcome couponem / quick-action chips
3. Potwierdź że obrazek, heading, subtitle i przyciski odpowiadają temu co admin skonfigurował w `/admin/hero`

- [ ] **Step 3.3: Nawigacja i autoplay**

4. Odczekaj ~5 sekund — slajd powinien się zmienić automatycznie
5. Sprawdź strzałki prev/next — działa wrap-around (ostatni → next → pierwszy i odwrotnie)
6. Kliknij kropkę — slajd powinien przejść bezpośrednio do wybranego
7. Najedź myszką — autoplay powinien się zatrzymać; odejdź — wznowić

- [ ] **Step 3.4: CTA buttons**

8. Kliknij przycisk CTA z href zaczynającym się od `/` — powinno nawigować bez przeładowania strony (SPA)
9. Kliknij przycisk CTA z href zewnętrznym — powinien otworzyć nową kartę

- [ ] **Step 3.5: Edge cases**

10. W `/admin/hero` wyłącz wszystkie slajdy → na dashboardzie sekcja powinna być niewidoczna
11. Włącz dokładnie 1 slajd → sekcja widoczna, strzałki i kropki ukryte

- [ ] **Step 3.6: Responsive**

12. Widok mobile (≤ 768px): baner pełna szerokość, 160px, tekst czytelny, przyciski dostępne
13. Widok desktop (≥ 768px): baner wypełnia kolumnę główną, sidebar nienaruszony

---

## Definition of Done

- [ ] `npx tsc --noEmit` bez błędów
- [ ] Baner widoczny w `/user` ze slajdami z `/admin/hero`
- [ ] Autoplay, nawigacja, CTA działają
- [ ] Edge cases (0 slajdów, 1 slajd) obsłużone
- [ ] Wszystkie commity na gałęzi
