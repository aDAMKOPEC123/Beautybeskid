# Modern Glamour Refresh – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Odświeżyć wygląd aplikacji COSMO w kierunku "Modern Glamour" — geometryczne dekoracje, sekcje numerowane, editorial eyebrow labels, pewny siebie CTA — bez żadnych zmian funkcjonalności.

**Architecture:** Pure visual refresh — modyfikacje CSS/JSX only. Nowe reużywalne komponenty dekoracyjne SVG (`DecoElements.tsx`) dostarczają budulec dla wszystkich stron. Komponenty UI (`button.tsx`, `card.tsx`, `input.tsx`, `skeleton.tsx`) dostają nowe hover/focus states. Następnie zmiany aplikowane strona po stronie.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, lucide-react, class-variance-authority (cva)

---

## Pliki — mapa zmian

| Akcja | Plik |
|-------|------|
| **Utwórz** | `apps/web/src/components/shared/DecoElements.tsx` |
| **Utwórz** | `apps/web/src/components/ui/spinner.tsx` |
| **Modyfikuj** | `apps/web/src/components/ui/button.tsx` |
| **Modyfikuj** | `apps/web/src/components/ui/card.tsx` |
| **Modyfikuj** | `apps/web/src/components/ui/input.tsx` |
| **Modyfikuj** | `apps/web/src/components/ui/skeleton.tsx` |
| **Modyfikuj** | `apps/web/src/index.css` |
| **Modyfikuj** | `apps/web/src/pages/public/Home.tsx` |
| **Modyfikuj** | `apps/web/src/components/layout/Navbar.tsx` (Navbar publiczny) |
| **Modyfikuj** | `apps/web/src/components/ui/ServiceCard.tsx` |
| **Modyfikuj** | `apps/web/src/components/public/HeroSlider.tsx` |
| **Modyfikuj** | `apps/web/src/components/layout/MobileBottomNav.tsx` |
| **Modyfikuj** | `apps/web/src/pages/user/Dashboard.tsx` |
| **Modyfikuj** | `apps/web/src/pages/user/Appointments.tsx` |
| **Modyfikuj** | `apps/web/src/pages/user/Profile.tsx` |
| **Modyfikuj** | `apps/web/src/pages/user/SkinJournal.tsx` |
| **Modyfikuj** | `apps/web/src/pages/user/BookingWizard.tsx` |
| **Modyfikuj** | `apps/web/src/components/calendar/AppointmentCard.tsx` |

---

## Task 1: Dekoracyjne komponenty SVG (`DecoElements.tsx`)

**Files:**
- Create: `apps/web/src/components/shared/DecoElements.tsx`

Wszystkie komponenty: `pointer-events: none`, `aria-hidden="true"`, `position: absolute`, `user-select: none`. Konfigurowalne przez props.

- [ ] **Krok 1: Utwórz plik z czterema komponentami**

```tsx
// apps/web/src/components/shared/DecoElements.tsx

import { cn } from '@/lib/utils';

interface GeoCircleProps {
  size?: number;
  opacity?: number;
  className?: string;
}

/** Radial gradient circle — dekoracja tła */
export function GeoCircle({ size = 240, opacity = 0.18, className }: GeoCircleProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute pointer-events-none select-none deco-float', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(196,168,130,${opacity}) 0%, transparent 70%)`,
      }}
    />
  );
}

interface GeoArcProps {
  size?: number;
  opacity?: number;
  className?: string;
}

/** Ćwiartka okręgu (stroke only) — dekoracja narożnika */
export function GeoArc({ size = 100, opacity = 0.25, className }: GeoArcProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute pointer-events-none select-none deco-float', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid rgba(196,168,130,${opacity})`,
      }}
    />
  );
}

interface SectionNumberProps {
  n: number;
  opacity?: number;
  className?: string;
}

/** Wielka dekoracyjna cyfra sekcji (01, 02, …) */
export function SectionNumber({ n, opacity = 0.07, className }: SectionNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute pointer-events-none select-none font-heading leading-none',
        className
      )}
      style={{
        fontSize: 130,
        fontWeight: 700,
        color: `rgba(196,168,130,${opacity})`,
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

interface DecoLineProps {
  width?: number;
  className?: string;
}

/** Horizontal caramel line — do eyebrow labels */
export function DecoLine({ width = 24, className }: DecoLineProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block bg-caramel flex-shrink-0', className)}
      style={{ width, height: 1 }}
    />
  );
}
```

- [ ] **Krok 2: Sprawdź że plik się kompiluje**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwany wynik: brak błędów TypeScript.

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/shared/DecoElements.tsx
git commit -m "feat(ui): add DecoElements SVG decorative components (GeoCircle, GeoArc, SectionNumber, DecoLine)"
```

---

## Task 2: CSS — animacje dekoracyjne + grain overlay + skeleton shimmer

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Krok 1: Dodaj animacje i grain overlay na końcu `index.css`**

```css
/* ── Modern Glamour Refresh additions ── */

/* Floating animation for GeoCircle / GeoArc */
@keyframes deco-float {
  0%   { transform: translateY(0px); }
  100% { transform: translateY(-6px); }
}

/* Disable decorative animations for users who prefer reduced motion.
   GeoCircle i GeoArc używają klasy CSS "deco-float" (nie inline style)
   — dzięki temu ta reguła działa niezawodnie we wszystkich przeglądarkach. */
@media (prefers-reduced-motion: reduce) {
  .deco-float {
    animation: none !important;
  }
}

/* Caramel skeleton shimmer — replaces default muted pulse */
@keyframes caramel-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton-caramel {
  background: linear-gradient(
    90deg,
    rgba(196,168,130,0.05) 25%,
    rgba(196,168,130,0.15) 50%,
    rgba(196,168,130,0.05) 75%
  );
  background-size: 800px 100%;
  animation: caramel-shimmer 1.5s infinite linear;
}

/* Grain texture overlay — apply to hero sections */
.grain-overlay {
  position: relative;
}
.grain-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  opacity: 0.025;
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Krok 2: Sprawdź że dev server nadal startuje bez błędów CSS**

```bash
cd apps/web && pnpm dev 2>&1 | head -10
```

Oczekiwany wynik: `VITE ready` bez błędów parsowania CSS.

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(styles): add deco-float keyframe, caramel skeleton shimmer, grain overlay CSS"
```

---

## Task 3: Button — nowe warianty i hover/press states

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Krok 1: Zaktualizuj `buttonVariants` w `button.tsx`**

Zastąp cały plik:

```tsx
// filepath: apps/web/src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[10px] font-sans font-medium tracking-[0.2em] uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-espresso text-ivory shadow hover:bg-espresso/90 hover:scale-[1.02] hover:brightness-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-espresso bg-transparent text-espresso shadow-sm hover:border-caramel hover:bg-caramel/[0.08] hover:text-espresso",
        secondary:
          "bg-cream text-espresso shadow-sm hover:bg-cream/80",
        ghost:
          "text-espresso hover:bg-cream",
        link:
          "text-espresso underline-offset-4 hover:underline border-b border-caramel pb-0.5 tracking-[0.15em]",
        caramel:
          "bg-caramel text-espresso shadow hover:bg-caramel/90 hover:scale-[1.02]",
        "ghost-underline":
          "bg-transparent text-espresso underline-offset-4 hover:underline tracking-[0.15em] px-0",
      },
      size: {
        default: "h-10 px-8 py-2",
        sm:      "h-8 px-5 py-1.5 text-[9px]",
        lg:      "h-12 px-10 py-3 text-[11px]",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Krok 2: Sprawdź kompilację TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Oczekiwany wynik: 0 błędów.

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "feat(ui): add ghost-underline variant, hover scale/brightness, active press state to Button"
```

---

## Task 4: Card — prop `accent` + hover state

**Files:**
- Modify: `apps/web/src/components/ui/card.tsx`

- [ ] **Krok 1: Zaktualizuj `card.tsx`**

```tsx
// filepath: apps/web/src/components/ui/card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accent, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow",
        accent && "border-l-[3px] border-l-caramel",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardContent, CardFooter }
```

- [ ] **Krok 2: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/ui/card.tsx
git commit -m "feat(ui): add accent prop to Card (caramel left-border), filter from DOM"
```

---

## Task 5: Input — caramel focus ring + placeholder color

**Files:**
- Modify: `apps/web/src/components/ui/input.tsx`

- [ ] **Krok 1: Zaktualizuj klasy w `input.tsx`**

Zmień linię z `className={cn(...)` — usuń `focus-visible:ring-1 focus-visible:ring-ring` i zastąp caramel shadow:

```tsx
// filepath: apps/web/src/components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#B8A898] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_2px_rgba(196,168,130,0.35)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Krok 2: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/ui/input.tsx
git commit -m "feat(ui): caramel focus shadow on Input, warmer placeholder color"
```

---

## Task 6: Skeleton — caramel shimmer

**Files:**
- Modify: `apps/web/src/components/ui/skeleton.tsx`

- [ ] **Krok 1: Zamień `animate-pulse bg-muted` na `skeleton-caramel`**

```tsx
// apps/web/src/components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-md skeleton-caramel', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

> Klasa `skeleton-caramel` jest zdefiniowana w `index.css` (Task 2).

- [ ] **Krok 2: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/ui/skeleton.tsx
git commit -m "feat(ui): caramel shimmer animation on Skeleton component"
```

---

## Task 7: Spinner — nowy komponent

**Files:**
- Create: `apps/web/src/components/ui/spinner.tsx`

- [ ] **Krok 1: Utwórz plik**

```tsx
// apps/web/src/components/ui/spinner.tsx
import { cn } from '@/lib/utils';

const sizes = { sm: 'h-3', md: 'h-4', lg: 'h-6' } as const;
const barSizes = { sm: 'w-0.5', md: 'w-1', lg: 'w-1.5' } as const;

interface SpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * Trzy animowane pałeczki (stagger) w kolorze caramel.
 * Zastępuje generyczne animate-spin w miejscach pasujących kontekstowo.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-flex items-end gap-[3px]', sizes[size], className)}
      aria-label="Ładowanie..."
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('bg-caramel rounded-sm animate-bounce', barSizes[size], sizes[size])}
          style={{ animationDelay: `${i * 100}ms`, animationDuration: '600ms' }}
        />
      ))}
    </span>
  );
}
```

- [ ] **Krok 2: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 3: Commit**

```bash
git add apps/web/src/components/ui/spinner.tsx
git commit -m "feat(ui): add Spinner component with staggered caramel bars"
```

---

## Task 8: Strona Home — sekcja Hero + Usługi sezonowe + Testimonials + Ticker + FAQ

**Files:**
- Modify: `apps/web/src/pages/public/Home.tsx`

Zmiany są addytywne — dodajemy dekoracje i modyfikujemy style, nie ruszamy logiki.

- [ ] **Krok 1: Dodaj import DecoElements na górze pliku**

W sekcji importów `Home.tsx` dodaj:

```tsx
import { GeoCircle, GeoArc, SectionNumber, DecoLine } from '@/components/shared/DecoElements';
import { ArrowRight } from 'lucide-react';
```

- [ ] **Krok 2: Zaktualizuj sekcję Hero (sekcja `1. HERO`)**

Znajdź `{/* ── 1. HERO ── */}` i zastąp zawartość `<section>`:

```tsx
{/* ── 1. HERO ── */}
<section className="py-16 md:py-24 grain-overlay" style={{ backgroundColor: '#F5F0EB' }}>
  <div className="container max-w-6xl mx-auto px-6">
    <div className="grid md:grid-cols-2 gap-12 items-center relative">

      {/* Dekoracje tła */}
      <GeoCircle size={280} opacity={0.16} className="top-[-40px] right-[-40px]" />
      <GeoArc   size={110} opacity={0.22} className="top-[20px] right-[20px]" />
      <SectionNumber n={1} opacity={0.07} className="top-[-10px] right-[24px]" />

      {/* Floating badge */}
      <div
        className="hidden md:flex absolute top-8 right-6 z-10 w-[72px] h-[72px] rounded-full flex-col items-center justify-center text-center leading-snug"
        style={{ border: '1px solid rgba(196,168,130,0.4)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4A882', background: 'rgba(245,240,235,0.9)' }}
        aria-hidden="true"
      >
        Salon<br />od 2018
      </div>

      {/* Left column */}
      <div className="relative z-10">
        {/* Eyebrow — z pill na linia + wersaliki */}
        <div className="flex items-center gap-3 mb-6">
          <DecoLine />
          <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
            Profesjonalny salon kosmetologiczny
          </span>
        </div>

        <h1 className="font-heading text-5xl md:text-6xl font-bold leading-tight mb-6" style={{ color: '#1A1208' }}>
          Twoja pielęgnacja,{' '}
          <em className="font-heading italic" style={{ color: '#B8913A' }}>nasza pasja</em>
        </h1>

        <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(26,18,8,0.65)' }}>
          {/* WAŻNE: Skopiuj tutaj istniejący tekst akapitu z oryginalnego pliku Home.tsx.
              NIE usuwaj — to jest tylko przykładowy snippet struktury, nie drop-in replacement. */}
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Główny CTA z ikonką strzałki */}
          <Button size="lg" className="rounded-full gap-2" asChild>
            <Link to={isAuthenticated ? '/rezerwacja' : '/auth/login'}>
              Umów wizytę
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                <ArrowRight size={12} />
              </span>
            </Link>
          </Button>
          {/* Drugorzędny — ghost-underline */}
          <Button variant="ghost-underline" size="lg" asChild>
            <Link to="/uslugi">Nasze usługi</Link>
          </Button>
        </div>

        {/* slot urgency — bez zmian */}
      </div>

      {/* Right column — bez zmian */}
    </div>
  </div>
</section>
```

> **Uwaga:** W `<p>` z opisem i w prawej kolumnie zachowaj istniejącą treść bez zmian. Zmieniamy tylko eyebrow, CTA buttons i dodajemy dekoracje.

- [ ] **Krok 3: Zaktualizuj sekcję Usługi sezonowe**

Znajdź sekcję z sezonowymi usługami (zawiera `seasonalServices.map`). Dodaj `SectionNumber` i `DecoLine` do nagłówka, zmień tło sekcji i dodaj strzałkę do kart:

```tsx
{/* Nagłówek sekcji */}
<div className="flex items-end justify-between mb-8 relative">
  <div>
    <div className="flex items-center gap-3 mb-2">
      <DecoLine />
      <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
        Polecane zabiegi
      </span>
    </div>
    <h2 className="font-heading text-3xl font-bold" style={{ color: '#1A1208' }}>
      Na ten sezon
    </h2>
  </div>
  <SectionNumber n={2} opacity={0.12} className="right-0 bottom-[-8px]" />
</div>
```

W stylu sekcji zmień `backgroundColor` na `'#EDE8DE'`.

W każdej karcie usługi (`.map`) dodaj w footer: `<ArrowRight size={12} className="text-muted-foreground" />` po prawej stronie obok ceny.

- [ ] **Krok 4: Zaktualizuj sekcję Testimonials**

Znajdź sekcję z testimonials. Zmień nagłówek i styl cytatów:

```tsx
{/* Header testimonials */}
<div className="relative mb-10">
  <SectionNumber n={3} opacity={0.07} className="top-[-20px] right-0" />
  <div className="flex items-center gap-4 justify-center">
    <DecoLine width={40} />
    <span className="text-[10px] font-semibold tracking-[0.4em] uppercase text-caramel">
      Opinie Klientek
    </span>
    <DecoLine width={40} />
  </div>
  {/* Dekoracyjny cudzysłów */}
  <span
    className="absolute right-4 top-[-10px] font-heading italic pointer-events-none select-none"
    aria-hidden="true"
    style={{ fontSize: 120, lineHeight: 1, color: 'rgba(196,168,130,0.08)' }}
  >
    &ldquo;
  </span>
</div>

{/* Cytaty — zmień font na Playfair italic */}
{testimonials.map((t) => (
  <div key={t.author} className="testimonial-col ...">
    {/* Rating pałeczki zamiast gwiazdek */}
    <div className="flex gap-1 mb-3">
      {[1,2,3,4,5].map((i) => (
        <span key={i} className="inline-block rounded-sm" style={{
          width: 14, height: 2,
          background: i <= 5 ? '#C4A882' : 'rgba(196,168,130,0.25)'
        }} />
      ))}
    </div>
    {/* Cytat — Playfair italic */}
    <p className="font-heading italic text-base leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.75)' }}>
      "{t.quote}"
    </p>
    <p className="text-[10px] tracking-[0.1em] uppercase font-medium" style={{ color: '#B8913A' }}>
      {t.author}
    </p>
    <p className="text-[10px]" style={{ color: 'rgba(26,18,8,0.4)' }}>{t.label}</p>
  </div>
))}
```

- [ ] **Krok 5: Zaktualizuj Ticker**

Znajdź div z klasą `ticker-track`. Zmień styl kontenera na ciemne tło i dodaj separatory:

```tsx
{/* Ticker wrapper */}
<div className="overflow-hidden py-4 bg-espresso">
  <div className="ticker-track flex whitespace-nowrap">
    {[...tickerItems, ...tickerItems].map((item, i) => (
      <span key={i} className="mx-6 text-[11px] font-medium tracking-[0.2em] uppercase text-caramel">
        {item}
        <span className="ml-6 opacity-40">·</span>
      </span>
    ))}
  </div>
</div>
```

- [ ] **Krok 6: Zaktualizuj FAQ — dodaj SectionNumber i kolor strzałki**

Znajdź sekcję FAQ. Dodaj `<SectionNumber n={4} opacity={0.07} />` w nagłówku. Strzałce expand/collapse dodaj `style={{ color: '#C4A882' }}` lub klasę `text-caramel`.

- [ ] **Krok 7: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 8: Commit**

```bash
git add apps/web/src/pages/public/Home.tsx
git commit -m "feat(home): Modern Glamour refresh — deco numbers, eyebrow lines, new CTAs, ticker dark bg, testimonials italic"
```

---

## Task 9: Navbar + HeroSlider

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx` (publiczny navbar — renderowany przez `PublicLayout.tsx`)
- Modify: `apps/web/src/components/public/HeroSlider.tsx`

- [ ] **Krok 1: Otwórz `apps/web/src/components/layout/Navbar.tsx`**

> To jest jedyny plik publicznego Navbar. Nie modyfikuj `UserLayout.tsx` — to osobny layout dla zalogowanych użytkowników.

- [ ] **Krok 2: Navbar — dodaj CTA i zmień logo**

W `Navbar.tsx`:
1. Dodaj do logo: `style={{ letterSpacing: '0.08em' }}`
2. Dodaj aktywnym linkom: `className="... border-b-2 border-caramel"`
3. Dodaj po prawej stronie (desktop only, `hidden md:block`):

```tsx
<Button variant="ghost-underline" size="sm" asChild>
  <Link to="/rezerwacja">Rezerwacja</Link>
</Button>
```

- [ ] **Krok 3: HeroSlider — dodaj arc nakładkę i linię przed eyebrow**

W `HeroSlider.tsx`, wewnątrz każdego slajdu (`.map`), dodaj **przed** contentem:

```tsx
{/* Dekoracyjny arc — nakładka na slajd */}
<div
  aria-hidden="true"
  className="absolute top-4 right-4 pointer-events-none"
  style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(196,168,130,0.2)' }}
/>
```

Przed eyebrow label w tekście slajdu dodaj `<DecoLine className="mb-2" />`.

Import na górze: `import { DecoLine } from '@/components/shared/DecoElements';`

- [ ] **Krok 4: Sprawdź kompilację**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 5: Commit**

```bash
git add apps/web/src/components/layout/ apps/web/src/components/public/HeroSlider.tsx
git commit -m "feat(nav,slider): ghost-underline CTA in navbar, arc overlay + deco line in HeroSlider"
```

---

## Task 10: ServiceList + Blog

**Files:**
- Modify: `apps/web/src/pages/public/` (sprawdź nazwy plików: `ServiceList.tsx` lub podobne)

- [ ] **Krok 1: Znajdź plik ServiceList**

```bash
ls apps/web/src/pages/public/
```

- [ ] **Krok 2: ServiceList — arc w hero**

W hero sekcji `ServiceList.tsx`: importuj `GeoArc` i dodaj `<GeoArc size={120} className="top-4 right-4" />`.

- [ ] **Krok 2b: ServiceCard — strzałka + hover (`apps/web/src/components/ui/ServiceCard.tsx`)**

> Karty usług są renderowane przez komponent `ServiceCard.tsx`, nie bezpośrednio w `ServiceList.tsx`. Otwórz ten plik.

Na głównym wrapperze karty dodaj do className: `hover:scale-[1.03] hover:shadow-lg transition-all duration-300`.

W footer karty (obok ceny) dodaj: `<ArrowRight size={12} className="text-muted-foreground" />`. Import na górze: `import { ArrowRight } from 'lucide-react';`

- [ ] **Krok 3: Blog — data deko + ghost-underline + labels**

W `BlogList.tsx` (lub podobnym), w każdej karcie artykułu:
- Dodaj dekoracyjny rok/datę: `<span aria-hidden style={{ fontSize: 48, color: 'rgba(196,168,130,0.07)', fontFamily: 'Playfair Display', position: 'absolute', right: 12, top: 8, lineHeight: 1 }}>{new Date(post.createdAt).getFullYear()}</span>`
- "Czytaj dalej": zmień na `<Button variant="ghost-underline" size="sm" asChild>`
- Category label: dodaj `flex items-center gap-2` + `<DecoLine />` z lewej

- [ ] **Krok 4: Commit**

```bash
git add apps/web/src/pages/public/
git commit -m "feat(public): arc deco on ServiceList hero, arrow on cards, blog date deco + ghost CTA"
```

---

## Task 11: Dashboard — DecoLine, segmented loyalty bar, empty states

**Files:**
- Modify: `apps/web/src/pages/user/Dashboard.tsx`

- [ ] **Krok 1: Dodaj import DecoLine**

```tsx
import { DecoLine } from '@/components/shared/DecoElements';
```

- [ ] **Krok 2: Powitanie — dodaj DecoLine przed nagłówkiem**

Znajdź `<h1>Cześć, {name}!</h1>` i dodaj przed nim:

```tsx
<DecoLine width={40} className="mb-3" />
```

- [ ] **Krok 3: Loyalty progress bar — zamień na segmented**

Znajdź istniejący `<progress>` lub `<div>` z paskiem lojalności i zastąp:

```tsx
{/* Segmented loyalty bar */}
{(() => {
  const TIERS = [
    { label: 'Brąz', max: 499 },
    { label: 'Srebro', max: 1499 },
    { label: 'Złoto', max: Infinity },
  ];
  const points = loyaltyStats?.points ?? 0;
  // Progi zgodne z backendem: BRONZE 0–499, SILVER 500–1499, GOLD 1500+
  // Segment Gold (1499–1500) celowo pokazuje 0% lub 100% — "tier odblokowany" UX
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
        {TIERS.map((tier, i) => {
          const segMax = i === 0 ? 499 : i === 1 ? 1499 : 1500;
          const segMin = i === 0 ? 0 : i === 1 ? 499 : 1499;
          const fill = Math.min(Math.max(points - segMin, 0), segMax - segMin) / (segMax - segMin);
          return (
            <div key={tier.label} className="flex-1 rounded-full bg-caramel/15 overflow-hidden">
              <div
                className="h-full bg-caramel rounded-full transition-all duration-700"
                style={{ width: `${Math.round(fill * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
        {TIERS.map((t) => <span key={t.label}>{t.label}</span>)}
      </div>
    </div>
  );
})()}
```

- [ ] **Krok 4: Empty states — dodaj SVG ilustracje**

Znajdź miejsca gdzie renderowane są puste listy (brak wizyt, brak osiągnięć). Dodaj przed "brak danych" tekstem:

```tsx
{/* Brak wizyt */}
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="mx-auto mb-3 opacity-40">
  <rect x="8" y="12" width="32" height="28" rx="3" stroke="#C4A882" strokeWidth="1.5"/>
  <path d="M8 20h32" stroke="#C4A882" strokeWidth="1.5"/>
  <path d="M16 8v8M32 8v8" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
  <circle cx="24" cy="32" r="4" stroke="#C4A882" strokeWidth="1.5"/>
</svg>
```

- [ ] **Krok 5: Karty sekcji — gradient tło**

Na kartach sekcji dashboardu zmień `bg-card` lub `style={{ background: ... }}` na:

```tsx
style={{ background: 'linear-gradient(135deg, var(--background) 0%, hsl(var(--secondary)) 100%)' }}
```

- [ ] **Krok 6: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/pages/user/Dashboard.tsx
git commit -m "feat(dashboard): deco line, segmented loyalty bar (0/500/1500 pts), empty state SVGs, gradient cards"
```

---

## Task 12: Appointments — status border-l + empty state + appointment card

**Files:**
- Modify: `apps/web/src/pages/user/Appointments.tsx`
- Modify: `apps/web/src/components/calendar/AppointmentCard.tsx`

- [ ] **Krok 1: Status badges — dodaj `borderLeft` w `Appointments.tsx`**

Znajdź obiekty stylów statusów (szukaj `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`). Do każdego dodaj:

```tsx
borderLeft: '3px solid currentColor',
```

Upewnij się, że `color` jest ustawiony na ten sam kolor co tekst statusu (nie opacity), np.:

```tsx
{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', borderLeft: '3px solid #16a34a' }
```

- [ ] **Krok 2: Empty state — dodaj SVG kalendarza**

Znajdź "Brak wizyt" / pustą listę i dodaj przed tekstem:

```tsx
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="mx-auto mb-3 opacity-40">
  <rect x="8" y="12" width="32" height="28" rx="3" stroke="#C4A882" strokeWidth="1.5"/>
  <path d="M8 20h32" stroke="#C4A882" strokeWidth="1.5"/>
  <path d="M16 8v8M32 8v8" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M17 30h4M27 30h4M17 36h4" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
</svg>
```

- [ ] **Krok 3: AppointmentCard — border-l-caramel dla nadchodzących wizyt**

W `AppointmentCard.tsx` znajdź główny wrapper div i dodaj warunkowo (dla statusu CONFIRMED lub PENDING):

```tsx
className={cn(
  "...",
  (status === 'CONFIRMED' || status === 'PENDING') && "border-l-[3px] border-l-caramel"
)}
```

- [ ] **Krok 4: AppointmentCard — padding mobile**

Znajdź `p-4` na kontenerze i zmień na `p-4 sm:p-5`.

- [ ] **Krok 5: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/pages/user/Appointments.tsx apps/web/src/components/calendar/AppointmentCard.tsx
git commit -m "feat(appointments): status border-l, empty state SVG, caramel left-border on upcoming cards"
```

---

## Task 13: Profil — avatar ring + section headers

**Files:**
- Modify: `apps/web/src/pages/user/Profile.tsx`

- [ ] **Krok 1: Avatar — dodaj ring i shadow**

Znajdź element avatara (`<img>` lub `<Avatar>`). Dodaj klasy:

```tsx
className="... ring-2 ring-caramel/40 shadow-[0_0_20px_rgba(196,168,130,0.2)]"
```

- [ ] **Krok 2: Section headers — editorial eyebrow**

Dla każdego nagłówka sekcji profilu (np. "Dane osobowe", "Zmiana hasła") zmień na:

```tsx
import { DecoLine } from '@/components/shared/DecoElements';

<div className="flex items-center gap-3 mb-4">
  <DecoLine />
  <span className="text-[10px] font-semibold tracking-[0.35em] uppercase text-caramel">
    {sectionTitle}
  </span>
</div>
```

- [ ] **Krok 3: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/pages/user/Profile.tsx
git commit -m "feat(profile): caramel avatar ring, editorial eyebrow section headers"
```

---

## Task 14: Skin Journal — mood bars + empty state

**Files:**
- Modify: `apps/web/src/pages/user/SkinJournal.tsx`

- [ ] **Krok 1: Mood indicator — pałeczki**

Znajdź miejsce gdzie wyświetlane jest `mood` (1–5). Zastąp ikonki gwiazdek lub liczby:

```tsx
<div className="flex gap-1 items-end" aria-label={`Nastrój: ${entry.mood}/5`}>
  {[1,2,3,4,5].map((i) => (
    <span
      key={i}
      className="inline-block rounded-sm transition-all"
      style={{
        width: 10,
        height: i <= (entry.mood ?? 0) ? 12 : 6,
        background: i <= (entry.mood ?? 0) ? '#C4A882' : 'rgba(196,168,130,0.2)',
      }}
    />
  ))}
</div>
```

- [ ] **Krok 2: Empty state — SVG dziennik**

Znajdź "Brak wpisów" i dodaj:

```tsx
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="mx-auto mb-3 opacity-40">
  <rect x="10" y="6" width="28" height="36" rx="3" stroke="#C4A882" strokeWidth="1.5"/>
  <path d="M16 16h16M16 22h16M16 28h10" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M10 12h4V6" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
```

- [ ] **Krok 3: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/pages/user/SkinJournal.tsx
git commit -m "feat(journal): mood bar indicator (pałeczki), empty state SVG"
```

---

## Task 15: Bottom Navigation — caramel indicator + blur + touch targets

**Files:**
- Modify: `apps/web/src/components/layout/MobileBottomNav.tsx`

- [ ] **Krok 1: Zmień tło nav na blur + gradient**

Znajdź `style={{ background: '#fff', ... }}` na `<nav>` i zmień na:

```tsx
style={{ borderColor: 'rgba(0,0,0,0.08)' }}
className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t backdrop-blur-md bg-gradient-to-t from-ivory to-ivory/90"
```

- [ ] **Krok 2: Aktywny tab — caramel indicator line**

W `<Link>` dla każdego aktywnego taba, dodaj nad ikoną:

```tsx
{/* Indicator line nad ikoną */}
<span
  className={cn(
    'block h-0.5 rounded-full mx-auto mb-0.5 transition-all duration-200',
    active ? 'w-4 bg-caramel' : 'w-0 bg-transparent'
  )}
/>
```

Umieść to wewnątrz `<Link>`, przed `<div className="relative">`.

- [ ] **Krok 3: Touch targets — min 44px**

Na każdym `<Link>` i `<button>` w BOTTOM_TABS dodaj: `className="... min-h-[44px]"`.

- [ ] **Krok 4: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/components/layout/MobileBottomNav.tsx
git commit -m "feat(mobile-nav): blur bg, caramel active indicator line, 44px touch targets"
```

---

## Task 16: BookingWizard mobile — step dots + CTA height

**Files:**
- Modify: `apps/web/src/pages/user/BookingWizard.tsx`

- [ ] **Krok 1: Step indicator — zamień na dot-circles**

Znajdź istniejący step indicator (może być numeryczny lub progress bar). Zastąp:

```tsx
{/* Step dots */}
<div className="flex items-center justify-center gap-2 mb-6">
  {steps.map((_, i) => (
    <span
      key={i}
      className={cn(
        'rounded-full transition-all duration-300',
        i === currentStep
          ? 'w-4 h-2 bg-caramel'
          : i < currentStep
            ? 'w-2 h-2 bg-caramel/60'
            : 'w-2 h-2 bg-caramel/25'
      )}
    />
  ))}
</div>
```

> Uwaga: `steps` i `currentStep` — użyj nazw zmiennych istniejących w pliku. Odczytaj strukturę przed implementacją.

- [ ] **Krok 2: Główny CTA button — full-width na mobile, min-h**

Znajdź główny przycisk "Dalej" / "Rezerwuj". Dodaj klasy:

```tsx
className="... w-full sm:w-auto min-h-[52px]"
```

- [ ] **Krok 3: Sprawdź kompilację + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
git add apps/web/src/pages/user/BookingWizard.tsx
git commit -m "feat(booking): caramel step dots indicator, full-width 52px CTA on mobile"
```

---

## Task 17: Weryfikacja końcowa

- [ ] **Krok 1: Pełna kompilacja TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

Oczekiwany wynik: 0 błędów.

- [ ] **Krok 2: Sprawdź konsolę przeglądarki**

Uruchom `pnpm dev` i przejdź przez: `/`, `/uslugi`, `/blog`, `/user`, `/user/wizyty`, `/user/profil`, `/user/dziennik`, `/rezerwacja`.

Sprawdź:
- Brak React warnings w konsoli (szczególnie "Unknown prop `accent`")
- Brak błędów CSS
- Dekoracje nie zasłaniają treści
- Mobile (DevTools → 375px): bottom nav, karty, BookingWizard

- [ ] **Krok 3: Sprawdź prefers-reduced-motion**

W DevTools → Rendering → Emulate CSS media → `prefers-reduced-motion: reduce`. Sprawdź że GeoCircle/GeoArc się nie animują.

- [ ] **Krok 4: Finalne porządki + commit**

```bash
git add -A
git status  # sprawdź czy nic niechcianego
git commit -m "chore: final cleanup Modern Glamour Refresh"
```

---

## Kryteria akceptacji (z design spec)

- [ ] Zero zmian w logice, routingu, API
- [ ] Nowe elementy dekoracyjne mają `pointer-events: none` i `aria-hidden="true"`
- [ ] `@media (prefers-reduced-motion: reduce)` wyłącza `deco-float`
- [ ] `accent` prop w Card nie trafia do DOM
- [ ] Loyalty bar używa progów 0/500/1500 pkt — bez nowych wywołań API
- [ ] Wygląd spójny na 375px i 1280px+
- [ ] Brak regressions w testach backendowych: `cd apps/server && pnpm test`
