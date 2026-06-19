# Navbar Scroll-Hide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the invisible navbar problem on non-homepage pages and add scroll-hide UX on desktop.

**Architecture:** Single file change to `Navbar.tsx` — add `hidden` state driven by scroll direction, `isTransparent` logic gated to homepage only, mobile detection via `matchMedia` ref (no layout thrash), and a route-change reset effect.

**Tech Stack:** React 19, TypeScript, React Router v7 (`useLocation`), CSS `transform: translateY`

**Spec:** `docs/superpowers/specs/2026-04-17-navbar-scroll-hide-design.md`

---

### Task 1: Update Navbar.tsx with scroll-hide behavior

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`

---

- [ ] **Step 1: Add `useLocation` to the existing react-router-dom import**

Open `apps/web/src/components/layout/Navbar.tsx`. Line 3 currently reads:

```ts
import { Link, NavLink, useNavigate } from 'react-router-dom';
```

Change it to:

```ts
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
```

---

- [ ] **Step 2: Add new state, refs, and derived values inside the component**

Inside `export const Navbar = () => {`, after the existing `const [scrolled, setScrolled] = useState(false);` line, add:

```ts
const location = useLocation();
const isHomepage = location.pathname === '/';
const isTransparent = isHomepage && !scrolled;

const [hidden, setHidden] = useState(false);
const lastScrollY = useRef(0);
const isMobileRef = useRef(window.matchMedia('(max-width: 767px)').matches);
```

Also add `useRef` to the React import at the top of the file (line 2). Current import:

```ts
import { useState, useEffect } from 'react';
```

Should become:

```ts
import { useState, useEffect, useRef } from 'react';
```

---

- [ ] **Step 3: Add matchMedia listener to keep `isMobileRef` current on resize**

After the existing `const [scrolled, setScrolled] = useState(false);` block and the new state/refs added in Step 2, add this new `useEffect`:

```ts
useEffect(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  const handler = (e: MediaQueryListEvent) => { isMobileRef.current = e.matches; };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

---

- [ ] **Step 4: Add route-change reset effect**

Add this `useEffect` immediately after the matchMedia effect from Step 3:

```ts
useEffect(() => {
  setHidden(false);
}, [location.pathname]);
```

This ensures the navbar is always visible when navigating to a new page.

---

- [ ] **Step 5: Replace the existing scroll handler**

Find the existing scroll `useEffect` (currently lines 24–28):

```ts
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

Replace it entirely with:

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

---

- [ ] **Step 6: Update the `<nav>` element — className and style**

Find the `<nav>` opening tag (currently has `className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"`).

**Remove** `transition-all duration-300` from className — it conflicts with the inline `transition` style added below (inline wins and suppresses the class silently).

New `<nav>` tag:

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

---

- [ ] **Step 7: Replace `scrolled` with `isTransparent` in all color style props**

Inside the `<nav>` content, every `color` and `style` prop that switches between light/dark based on `scrolled` must be inverted to use `isTransparent`. The logic was `scrolled ? dark : light` — it becomes `isTransparent ? light : dark`.

Apply these replacements:

**Logo link** (color style):
```tsx
style={{ color: isTransparent ? '#FAF7F2' : '#1C1510', fontStyle: 'normal', fontWeight: 300, letterSpacing: '0.08em' }}
```

**NavLink color** (inside the map):
```tsx
style={{ color: isTransparent ? 'rgba(250,247,242,0.75)' : '#6B5A4E' }}
```

**Panel link** (authenticated, color style):
```tsx
style={{ color: isTransparent ? 'rgba(250,247,242,0.6)' : '#6B5A4E' }}
```

**Logout button** (authenticated, color style):
```tsx
style={{ color: isTransparent ? 'rgba(250,247,242,0.6)' : '#6B5A4E' }}
```

**Login link** (unauthenticated, color style):
```tsx
style={{ color: isTransparent ? 'rgba(250,247,242,0.7)' : '#6B5A4E' }}
```

**Hamburger spans** (mobile, background style):
```tsx
style={{ background: isTransparent ? '#FAF7F2' : '#1C1510' }}
```

---

- [ ] **Step 8: Verify TypeScript compiles clean**

Run from `cosmo-app/apps/web/`:

```bash
pnpm build
```

Expected: no TypeScript errors. Fix any type errors before proceeding.

Alternatively, for a faster check without a full bundle:

```bash
npx tsc --noEmit
```

Expected output: no errors printed.

---

- [ ] **Step 9: Manual smoke test**

Start the dev server from `cosmo-app/`:

```bash
pnpm dev
```

Open `http://localhost:5173` and verify:

| Test | Expected |
|------|----------|
| Homepage `/` at top | Navbar transparent, white text, visible |
| Homepage `/` after scrolling 70px | Navbar filled (cream), dark text |
| Homepage `/` scrolling down fast | Navbar slides up out of view |
| Homepage `/` scrolling back up | Navbar slides back down |
| Any other page (e.g. `/uslugi`) at top | Navbar filled immediately, dark text, no invisible state |
| Any other page scrolling down | Navbar hides |
| Any other page scrolling up | Navbar returns |
| Navigate between pages (client-side) | Navbar always visible on arrival at new page |
| Mobile (resize to <768px or devtools) | Navbar never hides on scroll |

---

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "feat: navbar scroll-hide on desktop, always visible on non-homepage"
```
