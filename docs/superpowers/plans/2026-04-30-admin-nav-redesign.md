# Admin Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the admin sidebar from 3 collapsible groups + 6 loose links into 7 clearly named collapsible sections.

**Architecture:** Single-file JSX refactor — replace three `useState` flags with seven, rebuild the `<nav>` JSX using the new section structure, and preserve all existing badge/event logic. No new components, no API changes, no route changes.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind CSS (Shadcn token classes), Lucide React

**Spec:** `docs/superpowers/specs/2026-04-30-admin-nav-redesign-design.md`

---

## File Map

| Action | File |
|---|---|
| Modify | `apps/web/src/components/layout/AdminLayout.tsx` |

That's it. One file.

---

### Task 1: Replace useState flags

**Files:**
- Modify: `apps/web/src/components/layout/AdminLayout.tsx` (lines 21–37)

- [ ] **Step 1: Remove the three old flags and add seven new ones**

Replace this block (roughly lines 21–37):

```tsx
const [pagesOpen, setPagesOpen] = useState(
  () =>
    location.pathname.startsWith('/admin/hero') ||
    location.pathname.startsWith('/admin/o-nas') ||
    location.pathname.startsWith('/admin/polecane-zabiegi') ||
    location.pathname.startsWith('/admin/uslugi') ||
    location.pathname.startsWith('/admin/blog') ||
    location.pathname.startsWith('/admin/metamorfozy')
);
const [discountsOpen, setDiscountsOpen] = useState(
  () => location.pathname.startsWith('/admin/kody-rabatowe') || location.pathname.startsWith('/admin/lojalnosc')
);
const [staffOpen, setStaffOpen] = useState(
  () =>
    location.pathname.startsWith('/admin/wizyty') ||
    location.pathname.startsWith('/admin/konsultacje') ||
    location.pathname.startsWith('/admin/praca') ||
    location.pathname.startsWith('/admin/pracownicy')
);
```

With:

```tsx
const [komunikacjaOpen, setKomunikacjaOpen] = useState(
  () => ['/admin/powiadomienia', '/admin/chat'].some(p => location.pathname.startsWith(p))
);
const [wizytyOpen, setWizytyOpen] = useState(
  () => ['/admin/wizyty', '/admin/konsultacje', '/admin/pracownicy', '/admin/praca'].some(p => location.pathname.startsWith(p))
);
const [klienciOpen, setKlienciOpen] = useState(
  () => ['/admin/uzytkownicy', '/admin/recenzje'].some(p => location.pathname.startsWith(p))
);
const [tresciOpen, setTresciOpen] = useState(
  () => ['/admin/hero', '/admin/polecane-zabiegi', '/admin/o-nas', '/admin/uslugi', '/admin/blog', '/admin/metamorfozy'].some(p => location.pathname.startsWith(p))
);
const [diagnostykaOpen, setDiagnostykaOpen] = useState(
  () => ['/admin/quizy', '/admin/pogoda-skory'].some(p => location.pathname.startsWith(p))
);
const [sprzedazOpen, setSprzedazOpen] = useState(
  () => ['/admin/kody-rabatowe', '/admin/lojalnosc', '/admin/asortyment'].some(p => location.pathname.startsWith(p))
);
const [ustawieniaOpen, setUstawieniaOpen] = useState(
  () => ['/admin/regulamin'].some(p => location.pathname.startsWith(p))
);
```

- [ ] **Step 2: Remove `totalStaffBadge` and add new aggregate badge consts**

Find and remove this line (around line 119):
```tsx
const totalStaffBadge = unreadCount + newLeadsCount;
```

Add in its place two new consts (right before the `if (isLoading)` guard):
```tsx
const komunikacjaBadge = adminNotifUnread + staffUnreadTotal;
const wizytyBadge = unreadCount + newLeadsCount;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: no errors about `pagesOpen`, `discountsOpen`, `staffOpen`, `totalStaffBadge` (they no longer exist) and no errors about the new flags.

---

### Task 2: Remove Lucide icon JSX

**Files:**
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Remove `<Bell />` from the Powiadomienia standalone link**

Find the Powiadomienia link (currently a standalone `<Link to="/admin/powiadomienia" ...>`). It has `<Bell className="h-4 w-4" />` inline. Remove that `<Bell />` element. The link will become part of the Komunikacja group in the next task, but remove the icon now.

- [ ] **Step 2: Remove `<ShoppingBag />` from the Asortyment standalone link**

Find the Asortyment `<Link>` block. Remove `<ShoppingBag className="h-4 w-4" />` from its JSX.

- [ ] **Step 3: Remove `<Cloud />` from the Twoja Skóra standalone link**

Find the Twoja Skóra `<Link>` block. Remove `<Cloud className="h-4 w-4" />` from its JSX.

- [ ] **Step 4: Remove unused Lucide imports**

At the top of the file, find:
```tsx
import { ChevronDown, Bell, ShoppingBag, Cloud } from 'lucide-react';
```

Change to:
```tsx
import { ChevronDown } from 'lucide-react';
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Rebuild nav JSX — 7 sections

**Files:**
- Modify: `apps/web/src/components/layout/AdminLayout.tsx` (the entire `<nav>` block)

This is the main task. Replace the entire `<nav>` block contents with the new 7-section structure.

- [ ] **Step 1: Replace the entire `<nav>` contents**

Find the `<nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">` element and replace everything inside it with:

```tsx
<Link to="/admin" className="px-4 py-2 hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">
  Dashboard
</Link>

{/* Komunikacja */}
<div>
  <button
    onClick={() => setKomunikacjaOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Komunikacja</span>
    <div className="flex items-center gap-1.5">
      {!komunikacjaOpen && komunikacjaBadge > 0 && (
        <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
          {komunikacjaBadge > 9 ? '9+' : komunikacjaBadge}
        </span>
      )}
      <ChevronDown size={14} className={komunikacjaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
    </div>
  </button>
  {komunikacjaOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link
        to="/admin/powiadomienia"
        className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
      >
        <span>Powiadomienia</span>
        {adminNotifUnread > 0 && (
          <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
            {adminNotifUnread > 9 ? '9+' : adminNotifUnread}
          </span>
        )}
      </Link>
      <Link
        to="/admin/chat"
        className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
      >
        <span>Chat</span>
        {staffUnreadTotal > 0 && (
          <span className="bg-destructive text-white text-xs rounded-full px-1.5 animate-pulse">
            {staffUnreadTotal > 9 ? '9+' : staffUnreadTotal}
          </span>
        )}
      </Link>
    </div>
  )}
</div>

{/* Wizyty i personel */}
<div>
  <button
    onClick={() => setWizytyOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Wizyty i personel</span>
    <div className="flex items-center gap-1.5">
      {!wizytyOpen && wizytyBadge > 0 && (
        <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center animate-pulse">
          {wizytyBadge > 9 ? '9+' : wizytyBadge}
        </span>
      )}
      <ChevronDown size={14} className={wizytyOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
    </div>
  </button>
  {wizytyOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link
        to="/admin/wizyty"
        onClick={markAllRead}
        className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-between ${
          unreadCount > 0
            ? 'bg-destructive/10 text-destructive animate-pulse font-semibold'
            : 'hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <span>Wizyty</span>
        {unreadCount > 0 && (
          <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
      <Link
        to="/admin/konsultacje"
        className="px-3 py-1.5 text-sm rounded-md flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
      >
        <span>Konsultacje</span>
        {newLeadsCount > 0 && (
          <span className="bg-primary text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
            {newLeadsCount > 9 ? '9+' : newLeadsCount}
          </span>
        )}
      </Link>
      <Link to="/admin/pracownicy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Pracownicy
      </Link>
      <Link to="/admin/praca" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Praca
      </Link>
    </div>
  )}
</div>

{/* Klienci */}
<div>
  <button
    onClick={() => setKlienciOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Klienci</span>
    <ChevronDown size={14} className={klienciOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {klienciOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/uzytkownicy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Użytkownicy
      </Link>
      <Link to="/admin/recenzje" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Recenzje
      </Link>
    </div>
  )}
</div>

{/* Treści */}
<div>
  <button
    onClick={() => setTresciOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Treści</span>
    <ChevronDown size={14} className={tresciOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {tresciOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/hero" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Slider strony głównej
      </Link>
      <Link to="/admin/polecane-zabiegi" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Polecane zabiegi
      </Link>
      <Link to="/admin/o-nas" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Strona „O nas"
      </Link>
      <Link to="/admin/uslugi" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Zarządzaj Usługami
      </Link>
      <Link to="/admin/blog" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Wpisy na Blogu
      </Link>
      <Link to="/admin/metamorfozy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Metamorfozy
      </Link>
    </div>
  )}
</div>

{/* Diagnostyka */}
<div>
  <button
    onClick={() => setDiagnostykaOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Diagnostyka</span>
    <ChevronDown size={14} className={diagnostykaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {diagnostykaOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/quizy" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Quizy
      </Link>
      <Link to="/admin/pogoda-skory" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Twoja Skóra
      </Link>
    </div>
  )}
</div>

{/* Sprzedaż */}
<div>
  <button
    onClick={() => setSprzedazOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Sprzedaż</span>
    <ChevronDown size={14} className={sprzedazOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {sprzedazOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/kody-rabatowe" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Kody Rabatowe
      </Link>
      <Link to="/admin/lojalnosc" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Program Lojalnościowy
      </Link>
      <Link to="/admin/asortyment" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Asortyment
      </Link>
    </div>
  )}
</div>

{/* Ustawienia */}
<div>
  <button
    onClick={() => setUstawieniaOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Ustawienia</span>
    <ChevronDown size={14} className={ustawieniaOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {ustawieniaOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/regulamin" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Regulamin
      </Link>
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run dev server and do a visual smoke test**

```bash
cd cosmo-app && pnpm dev
```

Open `http://localhost:5173/admin` (log in as admin first). Verify:
- Sidebar shows Dashboard + 7 collapsible section headers
- No loose standalone links outside a group
- Each section expands/collapses on click
- Chevron rotates when open
- Navigating to `/admin/wizyty` auto-expands "Wizyty i personel"
- Navigating to `/admin/chat` auto-expands "Komunikacja"
- Navigating to `/admin/regulamin` auto-expands "Ustawienia"
- Badge on "Komunikacja" header is visible when there are unread notifications and section is collapsed
- Badge on "Wizyty i personel" header is visible when there are unread appointments and section is collapsed
- Wizyty link pulses red when there are unread appointment notifications

- [ ] **Step 4: Commit**

```bash
cd cosmo-app && git add apps/web/src/components/layout/AdminLayout.tsx
git commit -m "refactor(admin): reorganize sidebar nav into 7 collapsible sections

Replaces the mix of 3 groups + 6 standalone links with clearly named
sections: Komunikacja, Wizyty i personel, Klienci, Treści, Diagnostyka,
Sprzedaż, Ustawienia. All badge logic and route paths unchanged."
```
