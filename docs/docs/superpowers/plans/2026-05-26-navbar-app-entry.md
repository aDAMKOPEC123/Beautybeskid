# Navbar App Entry Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Zaloguj"/"Moje Konto" text links in the navbar with a two-line "Panel klienta" block that adapts to auth state and clearly communicates the app entry point.

**Architecture:** Single-file change to `Navbar.tsx`. The existing `panelLabel`/`panelLink` variable declarations are removed. Both the desktop CTA area and the mobile overlay bottom section get an inline two-line `<Link>` block that derives its label and destination from `isAuthenticated`, `isAdmin`, and `isEmployee`.

**Tech Stack:** React 19, TypeScript, react-router-dom Link, Tailwind (layout only), inline styles (COSMO pattern)

**Spec:** `docs/superpowers/specs/2026-05-26-navbar-app-entry-design.md`

---

## File Map

| Action | File |
|--------|------|
| Modify | `cosmo-app/apps/web/src/components/layout/Navbar.tsx` |

No new files. No other files touched.

---

### Task 1: Remove unused variables and prepare auth-state values

**Files:**
- Modify: `cosmo-app/apps/web/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Read the current file**

Open `cosmo-app/apps/web/src/components/layout/Navbar.tsx` and locate these two lines near the top of the `Navbar` component body (after the hooks):

```ts
const panelLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
const panelLabel = isAdmin ? 'Panel Admina' : isEmployee ? 'Panel Pracownika' : 'Moje Konto';
```

- [ ] **Step 2: Replace with the new derived values**

Replace both lines with the four variables needed for the two-line block:

```ts
const appLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
const appLine1 = isAdmin ? 'Panel admina \u2192' : isEmployee ? 'Panel pracownika \u2192' : 'Panel klienta \u2192';
const appLine2 = isAdmin ? 'panel administracyjny' : isEmployee ? 'panel pracownika' : (isAuthenticated ? 'moje konto' : 'zaloguj lub zarejestruj si\u0119');
const appDest = isAuthenticated ? appLink : '/auth/login';
```

> Note: `\u2192` is `→`, `\u0119` is the Polish `ę`. Using Unicode escapes avoids any file encoding issues.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd cosmo-app/apps/web && pnpm tsc --noEmit
```

Expected: no errors related to the changed lines.

---

### Task 2: Update the desktop CTA area

**Files:**
- Modify: `cosmo-app/apps/web/src/components/layout/Navbar.tsx` — desktop CTA section (`{isAuthenticated ? (...) : (...)}`)

The current desktop CTA renders two branches. Both branches need to replace the old text link with the new two-line block.

- [ ] **Step 1: Replace the authenticated desktop branch**

Find (inside the `hidden md:flex` CTA div, `isAuthenticated` branch):

```tsx
<Link
  to={panelLink}
  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
  style={{ color: '#5A7A62' }}
>
  {panelLabel}
</Link>
```

Replace with:

```tsx
<Link
  to={appDest}
  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textDecoration: 'none' }}
>
  <span style={{ color: '#C8956C', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid #C8956C', paddingBottom: '1px' }}>
    {appLine1}
  </span>
  <span style={{ color: '#9A9A8A', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    {appLine2}
  </span>
</Link>
```

- [ ] **Step 2: Replace the unauthenticated desktop branch**

Find (inside the `hidden md:flex` CTA div, `else` branch):

```tsx
<Link
  to="/auth/login"
  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
  style={{ color: '#5A7A62' }}
>
  Zaloguj
</Link>
```

Replace with the same two-line block (the `appDest` is `/auth/login` when not authenticated, and `appLine2` is "zaloguj lub zarejestruj się"):

```tsx
<Link
  to={appDest}
  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textDecoration: 'none' }}
>
  <span style={{ color: '#C8956C', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid #C8956C', paddingBottom: '1px' }}>
    {appLine1}
  </span>
  <span style={{ color: '#9A9A8A', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    {appLine2}
  </span>
</Link>
```

> Note: Both branches use the same JSX block. The variables `appLine1`, `appLine2`, `appDest` already resolve to the correct values per auth state, so no conditional is needed inside the JSX.

- [ ] **Step 3: Verify TypeScript**

```bash
cd cosmo-app/apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual check — desktop, unauthenticated**

Start the dev server if not running:
```bash
cd cosmo-app && pnpm dev
```

Open `http://localhost:5173` in a browser while **not** logged in.

Expected desktop navbar (right side):
```
[Rezerwacja]  [Panel klienta →]
                zaloguj lub zarejestruj się
```
The "Panel klienta →" text is caramel-colored with a caramel underline. The subtitle is small and gray.

- [ ] **Step 5: Visual check — desktop, logged in as regular user**

Log in as a regular user. Expected:
```
[Rezerwacja]  [Panel klienta →]  [Wyloguj]
                moje konto
```

Clicking "Panel klienta →" navigates to `/user` (dashboard).

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "feat: replace Zaloguj/Moje Konto with two-line Panel klienta block (desktop)"
```

---

### Task 3: Update the mobile overlay bottom section

**Files:**
- Modify: `cosmo-app/apps/web/src/components/layout/Navbar.tsx` — mobile bottom section

The mobile bottom section is inside the `AnimatePresence` / `motion.div` overlay, in the `container pb-8 flex flex-col gap-3 border-t` div.

- [ ] **Step 1: Replace the authenticated mobile branch**

Find (inside mobile bottom section, `isAuthenticated` branch):

```tsx
<Link
  to={panelLink}
  onClick={() => setMobileOpen(false)}
  className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
>
  {panelLabel}
</Link>
```

Replace with:

```tsx
<Link
  to={appDest}
  onClick={() => setMobileOpen(false)}
  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textDecoration: 'none', paddingTop: '8px', paddingBottom: '8px' }}
>
  <span style={{ color: '#C8956C', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid #C8956C', paddingBottom: '1px' }}>
    {appLine1}
  </span>
  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    {appLine2}
  </span>
</Link>
```

> On mobile the subtitle uses `rgba(255,255,255,0.4)` (ivory-toned gray) instead of `#9A9A8A`, because the mobile overlay background is dark green (`#1A3828`). The muted gray `#9A9A8A` would be unreadable on dark.

- [ ] **Step 2: Replace the unauthenticated mobile branch**

Find:

```tsx
<Link
  to="/auth/login"
  onClick={() => setMobileOpen(false)}
  className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
>
  Zaloguj się
</Link>
```

Replace with the same two-line block (same code as authenticated branch — variables resolve correctly):

```tsx
<Link
  to={appDest}
  onClick={() => setMobileOpen(false)}
  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textDecoration: 'none', paddingTop: '8px', paddingBottom: '8px' }}
>
  <span style={{ color: '#C8956C', fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: '1px solid #C8956C', paddingBottom: '1px' }}>
    {appLine1}
  </span>
  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
    {appLine2}
  </span>
</Link>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd cosmo-app/apps/web && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual check — mobile, unauthenticated**

Open `http://localhost:5173` on a narrow viewport (< 768px) or use browser DevTools mobile emulation.

Tap the hamburger to open the mobile menu.

Expected (bottom section):
```
[Panel klienta →]       ← caramel, left-aligned
 zaloguj lub zarejestruj się  ← small, semi-transparent white

[Zarezerwuj wizytę]     ← existing caramel block, unchanged
```

Tapping the link closes the overlay and navigates to `/auth/login`.

- [ ] **Step 5: Visual check — mobile, logged in as regular user**

Expected:
```
[Panel klienta →]   ← caramel, left-aligned
 moje konto         ← small, semi-transparent white

[Wyloguj]           ← unchanged, still below

[Zarezerwuj wizytę] ← unchanged
```

- [ ] **Step 6: Final commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "feat: update mobile nav with two-line Panel klienta entry block"
```

---

## Done Criteria

- [ ] Desktop navbar shows "Panel klienta →" / subtitle two-line block (right-aligned) for all auth states
- [ ] Mobile overlay shows same block (left-aligned, ivory subtitle) for all auth states
- [ ] Clicking the block navigates to correct destination per auth state
- [ ] Mobile overlay closes on click
- [ ] No "Zaloguj" or "Moje Konto"/"Panel Admina"/"Panel Pracownika" standalone links remain
- [ ] `panelLabel` and `panelLink` variables are removed
- [ ] `pnpm tsc --noEmit` passes
