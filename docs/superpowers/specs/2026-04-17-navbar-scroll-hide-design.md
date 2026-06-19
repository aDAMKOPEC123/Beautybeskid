# Navbar Scroll-Hide Design

**Date:** 2026-04-17
**File affected:** `apps/web/src/components/layout/Navbar.tsx` (only)

## Problem

The navbar is `fixed top-0` with a transparent background and white/ivory text at scroll position 0. On pages without a dark hero image (every page except the homepage), the navbar is invisible until the user scrolls 60px down. This makes navigation inaccessible on first load for all subpages.

## Solution

Three behavioral changes combined:

1. **Always filled on non-homepage pages** — transparent background is only used on `/` (homepage) where a dark hero image provides contrast.
2. **Scroll-hide on desktop** — navbar slides up (`translateY(-100%)`) when scrolling down past a threshold, and returns (`translateY(0)`) when scrolling up. Gives more vertical space while keeping the nav accessible.
3. **No scroll-hide on mobile** — top navbar on mobile shows only logo + hamburger; the mobile bottom nav (`MobileBottomNav`) handles navigation, so hiding the top bar adds no value.

## State Matrix

| Page | Scroll position | Result |
|------|----------------|--------|
| `/` (homepage) | 0–60px, any direction | Transparent nav, white text over dark hero, always visible |
| `/` (homepage) | >60px, scrolling up | Filled nav (cream), dark text, visible |
| `/` (homepage) | >60px, scrolling down | Nav hidden (slides up) |
| Any other page | 0px | Filled nav immediately — no transparent state |
| Any other page | scrolling down | Nav hidden (slides up) |
| Any other page | scrolling up | Nav visible (slides down) |
| Any page, mobile | any | Nav always visible, no scroll-hide |
| Route change | any | `hidden` resets to `false` — nav always visible on new page |

## Implementation

**Single file change:** `apps/web/src/components/layout/Navbar.tsx`

### New state / refs

```ts
const [hidden, setHidden] = useState(false);
const lastScrollY = useRef(0);
const location = useLocation(); // add to existing react-router-dom import
const isHomepage = location.pathname === '/';
```

### Reset hidden on route change

```ts
useEffect(() => {
  setHidden(false);
}, [location.pathname]);
```

### Mobile detection (outside scroll handler)

Use `matchMedia` to avoid layout thrash from reading `window.innerWidth` on every scroll event:

```ts
const isMobileRef = useRef(window.matchMedia('(max-width: 767px)').matches);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  const handler = (e: MediaQueryListEvent) => { isMobileRef.current = e.matches; };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

### Updated scroll handler

```ts
useEffect(() => {
  const onScroll = () => {
    const y = window.scrollY;
    setScrolled(y > 60);
    if (!isMobileRef.current) {
      // Hysteresis: require 10px upward movement to re-show, prevents flicker at boundary
      if (y > 100 && y > lastScrollY.current) {
        setHidden(true);
      } else if (y < lastScrollY.current - 10) {
        setHidden(false);
      }
    }
    lastScrollY.current = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

- `y > 100` threshold avoids hiding the nav on small nudges near the top
- `isMobileRef` is kept current via a `matchMedia('(max-width: 767px)')` listener, avoiding any layout reads inside the scroll handler

### Transparency logic

```ts
const isTransparent = isHomepage && !scrolled;
```

Replace all references to `scrolled` that control color/background with `isTransparent` (inverted).

### Nav element style update

Remove Tailwind `transition-all duration-300` from `className` — it conflicts with the inline `transition` style (inline wins, suppressing the class). Use only the inline transition below.

```tsx
<nav
  className="fixed top-0 left-0 right-0 z-50"
  style={{
    height: '72px',
    background: isTransparent ? 'transparent' : 'rgba(250,247,242,0.92)',
    backdropFilter: isTransparent ? 'none' : 'blur(12px)',
    WebkitBackdropFilter: isTransparent ? 'none' : 'blur(12px)',
    borderBottom: isTransparent ? 'none' : '1px solid rgba(28,21,16,0.08)',
    transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
    transition: 'transform 0.3s ease, background 0.3s ease, border-color 0.3s ease',
    willChange: 'transform',
  }}
>
```

### Text color references

All `color` style props that currently use `scrolled ? darkColor : lightColor` become `isTransparent ? lightColor : darkColor`.

## Constraints

- No new files
- No changes to `PublicLayout`, `MobileBottomNav`, or any other layout component
- Approximately 35 lines added/modified
- Must not affect the mobile fullscreen menu overlay (already `z-50`, unaffected by scroll-hide)
- Add `useLocation` to the existing `react-router-dom` import (currently missing from Navbar.tsx)
