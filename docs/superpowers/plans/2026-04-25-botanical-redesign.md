# Botanical Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the COSMO frontend from warm brown/caramel to forest green + warm oak, matching the physical salon's botanical aesthetic.

**Architecture:** All changes are purely visual — CSS variable values, Tailwind palette hex values, and hardcoded inline color strings in components. No logic, routing, or component structure changes. The existing token names (`ivory`, `cream`, `caramel`, etc.) are preserved so class names in components require no updates.

**Spec:** `docs/superpowers/specs/2026-04-25-botanical-redesign-design.md`

**Tech Stack:** Tailwind CSS v3, CSS custom properties (HSL), React/TSX inline styles

**Color mapping reference (old → new):**
| Old hex | New hex | Token |
|---------|---------|-------|
| `#FAF7F2` | `#F4F9F5` | ivory |
| `#F0EBE3` | `#E8F3EA` | cream |
| `#C4A882` | `#3D7A54` | caramel (now forest green) |
| `#8C6A4A` | `#2A5C3E` | walnut |
| `#1C1510` | `#1A3828` | espresso |
| `#6B5A4E` | `#5A7A62` | mink |
| `#B8913A` | `#C4965A` | gold accent → oak |
| `#2a1f15` | `#0f2418` | dark gradient start |

**rgba mapping (old RGB → new RGB, opacity unchanged):**
| Old | New | Usage |
|-----|-----|-------|
| `rgba(196,168,130,` | `rgba(61,122,84,` | caramel rgba |
| `rgba(28,21,16,` or `rgba(28, 21, 16,` | `rgba(26,56,40,` | espresso rgba |
| `rgba(184,145,58,` | `rgba(196,150,90,` | gold rgba → oak rgba |
| `rgba(245,240,235,` | `rgba(232,243,234,` | old cream rgba → new cream rgba |
| `rgba(26,18,8,` | `rgba(20,40,28,` | dark text rgba (BookingWizard) |

---

### Task 1: Update design tokens

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Update tailwind.config.ts palette hex values**

In `apps/web/tailwind.config.ts`, replace the `colors` extension fixed palette (lines ~59–66):

```ts
// Editorial palette — fixed values (botanical refresh)
ivory: '#F4F9F5',
cream: '#E8F3EA',
caramel: '#3D7A54',    // forest green — primary action
walnut: '#2A5C3E',     // deep forest accent
espresso: '#1A3828',   // near-black text
mink: '#5A7A62',       // muted green-gray
oak: '#C4965A',        // warm oak accent (new token)
```

- [ ] **Step 2: Update index.css :root CSS variables**

Replace the entire `:root { ... }` block in `apps/web/src/index.css`:

```css
:root {
  color-scheme: light;
  --background: 130 30% 97%;       /* #F4F9F5 ivory */
  --foreground: 150 37% 16%;       /* #1A3828 espresso */

  --card: 0 0% 100%;
  --card-foreground: 150 37% 16%;

  --popover: 0 0% 100%;
  --popover-foreground: 150 37% 16%;

  --primary: 142 33% 36%;          /* #3D7A54 caramel (forest green) */
  --primary-foreground: 130 30% 97%; /* light text on green button — intentional */

  --secondary: 128 28% 93%;        /* #E8F3EA cream */
  --secondary-foreground: 150 37% 16%;

  --muted: 128 28% 93%;
  --muted-foreground: 135 15% 42%; /* #5A7A62 mink */

  --accent: 128 28% 93%;
  --accent-foreground: 150 37% 16%;

  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 130 30% 97%;

  --border: 128 20% 88%;
  --input: 128 20% 88%;
  --ring: 142 33% 36%;

  --radius: 0.5rem;                /* was 0rem — organic rounding */
}
```

- [ ] **Step 3: Update index.css .dark CSS variables**

Replace the entire `.dark { ... }` block:

```css
.dark {
  --background: 140 20% 15%;
  --foreground: 130 30% 96%;
  --card: 140 15% 20%;
  --card-foreground: 130 30% 96%;
  --popover: 140 15% 20%;
  --popover-foreground: 130 30% 96%;
  --primary: 142 33% 36%;
  --primary-foreground: 140 20% 97%;
  --secondary: 140 10% 30%;
  --secondary-foreground: 130 30% 96%;
  --muted: 140 10% 25%;
  --muted-foreground: 140 10% 65%;
  --accent: 140 10% 30%;
  --accent-foreground: 130 30% 96%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 130 30% 96%;
  --border: 140 10% 25%;
  --input: 140 10% 25%;
  --ring: 142 33% 36%;
}
```

- [ ] **Step 4: Update glass-dark utility in index.css**

Find in `index.css` the `.glass-dark` rule and update the background:

```css
.glass-dark {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(26, 56, 40, 0.88);
}
```

- [ ] **Step 5: Update skeleton-caramel shimmer in index.css**

Find `.skeleton-caramel` in `index.css` and update all three gradient stops (opacities unchanged):

```css
.skeleton-caramel {
  background: linear-gradient(
    90deg,
    rgba(61,122,84,0.05) 25%,
    rgba(61,122,84,0.15) 50%,
    rgba(61,122,84,0.05) 75%
  );
  background-size: 800px 100%;
  animation: caramel-shimmer 1.5s infinite linear;
}
```

- [ ] **Step 6: Verify TypeScript build passes**

Run from `cosmo-app/apps/web/`:
```bash
pnpm build
```
Expected: exits 0, no TypeScript errors. CSS-only changes should not cause TS errors.

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/web/tailwind.config.ts apps/web/src/index.css
git commit -m "style: update design tokens to botanical palette (forest green + warm oak)"
```

---

### Task 2: Update layout components

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

These are the most visible components — full-page chrome.

- [ ] **Step 1: Fix Navbar.tsx hardcoded colors**

In `apps/web/src/components/layout/Navbar.tsx`, make these replacements:

| Find | Replace |
|------|---------|
| `color: '#1C1510'` | `color: '#1A3828'` |
| `background: '#1C1510'` | `background: '#1A3828'` |
| `color: '#6B5A4E'` | `color: '#5A7A62'` |

Verify with:
```bash
grep -n "#1C1510\|#6B5A4E" cosmo-app/apps/web/src/components/layout/Navbar.tsx
```
Expected: no output (all replaced).

- [ ] **Step 2: Fix UserLayout.tsx hardcoded colors**

In `apps/web/src/components/layout/UserLayout.tsx`, make these replacements:

| Find | Replace |
|------|---------|
| `color: '#1C1510'` | `color: '#1A3828'` |
| `color: '#6B5A4E'` | `color: '#5A7A62'` |

Verify with:
```bash
grep -n "#1C1510\|#6B5A4E" cosmo-app/apps/web/src/components/layout/UserLayout.tsx
```
Expected: no output.

- [ ] **Step 3: Verify TypeScript build passes**

```bash
cd cosmo-app/apps/web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/Navbar.tsx apps/web/src/components/layout/UserLayout.tsx
git commit -m "style: update hardcoded colors in layout components (Navbar, UserLayout)"
```

---

### Task 3: Update public pages

**Files:**
- Modify: `apps/web/src/pages/public/Home.tsx`
- Modify: `apps/web/src/pages/public/ServiceList.tsx`

- [ ] **Step 1: Fix Home.tsx hardcoded colors**

In `apps/web/src/pages/public/Home.tsx`, make these replacements:

| Find | Replace |
|------|---------|
| `color: '#C4A882'` | `color: '#3D7A54'` |
| `background: '#C4A882'` | `background: '#3D7A54'` |
| `background: '#C4A882',` (in object literal) | `background: '#3D7A54',` |
| `color: '#1C1510'` | `color: '#1A3828'` |
| `background: '#1C1510'` (the marquee strip, line ~331) | `background: '#1A3828'` |
| `color: '#6B5A4E'` | `color: '#5A7A62'` |
| `background: '#F0EBE3'` | `background: '#E8F3EA'` |
| `rgba(196,168,130,` | `rgba(61,122,84,` |
| `rgba(245,240,235,` | `rgba(232,243,234,` |

Verify:
```bash
grep -n "#1C1510\|#6B5A4E\|#C4A882\|#F0EBE3\|rgba(196,168,130\|rgba(245,240,235" cosmo-app/apps/web/src/pages/public/Home.tsx
```
Expected: no output.

- [ ] **Step 2: Fix ServiceList.tsx hardcoded colors**

In `apps/web/src/pages/public/ServiceList.tsx`, make these replacements:

| Find | Replace |
|------|---------|
| `background: '#FAF7F2'` | `background: '#F4F9F5'` |
| `background: '#F0EBE3'` | `background: '#E8F3EA'` |

Verify:
```bash
grep -n "#FAF7F2\|#F0EBE3" cosmo-app/apps/web/src/pages/public/ServiceList.tsx
```
Expected: no output.

- [ ] **Step 3: Verify TypeScript build**

```bash
cd cosmo-app/apps/web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/Home.tsx apps/web/src/pages/public/ServiceList.tsx
git commit -m "style: update hardcoded colors in public pages (Home, ServiceList)"
```

---

### Task 4: Update user pages

**Files:**
- Modify: `apps/web/src/pages/user/Loyalty.tsx`
- Modify: `apps/web/src/pages/user/Notifications.tsx`
- Modify: `apps/web/src/pages/user/SkinJournal.tsx`
- Modify: `apps/web/src/pages/user/Appointments.tsx`
- Modify: `apps/web/src/pages/user/Referrals.tsx`
- Modify: `apps/web/src/pages/user/BookingWizard.tsx`

- [ ] **Step 1: Fix Loyalty.tsx**

In `apps/web/src/pages/user/Loyalty.tsx`:

| Find | Replace |
|------|---------|
| `'linear-gradient(135deg, #2a1f15 0%, #1C1510 100%)'` | `'linear-gradient(135deg, #0f2418 0%, #1A3828 100%)'` |
| `rgba(28,21,16,` | `rgba(26,56,40,` |
| `color: '#C4A882'` | `color: '#3D7A54'` |

- [ ] **Step 2: Fix Notifications.tsx**

In `apps/web/src/pages/user/Notifications.tsx`:

| Find | Replace |
|------|---------|
| `color: '#6B5A4E'` | `color: '#5A7A62'` |

- [ ] **Step 3: Fix SkinJournal.tsx**

In `apps/web/src/pages/user/SkinJournal.tsx`:

| Find | Replace |
|------|---------|
| `'#C4A882'` (SVG stroke and fill) | `'#3D7A54'` |
| `rgba(196,168,130,` | `rgba(61,122,84,` |

- [ ] **Step 4: Fix Appointments.tsx**

In `apps/web/src/pages/user/Appointments.tsx`:

| Find | Replace |
|------|---------|
| `'#C4A882'` (SVG strokes) | `'#3D7A54'` |
| `rgba(184,145,58,` | `rgba(196,150,90,` |
| `color: '#B8913A'` | `color: '#C4965A'` |

Note: `color: '#92400E'` (amber text for PENDING status) is a semantic status color — **leave unchanged**.

- [ ] **Step 5: Fix Referrals.tsx**

In `apps/web/src/pages/user/Referrals.tsx`:

| Find | Replace |
|------|---------|
| `background: '#FAF7F2'` | `background: '#F4F9F5'` |
| `color: '#B8913A'` | `color: '#C4965A'` |
| `rgba(184,145,58,` | `rgba(196,150,90,` |

- [ ] **Step 6: Fix BookingWizard.tsx**

In `apps/web/src/pages/user/BookingWizard.tsx`:

| Find | Replace |
|------|---------|
| `rgba(184,145,58,` | `rgba(196,150,90,` |
| `'#B8913A'` | `'#C4965A'` |
| `rgba(26,18,8,` | `rgba(20,40,28,` |

- [ ] **Step 7: Verify no old colors remain in user pages**

```bash
grep -rn "#1C1510\|#6B5A4E\|#C4A882\|#FAF7F2\|#F0EBE3\|#B8913A\|#2a1f15\|rgba(184,145,58\|rgba(196,168,130\|rgba(28,21,16\|rgba(26,18,8" cosmo-app/apps/web/src/pages/user/
```
Expected: no output.

- [ ] **Step 8: Verify TypeScript build**

```bash
cd cosmo-app/apps/web && pnpm build
```

- [ ] **Step 9: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Loyalty.tsx apps/web/src/pages/user/Notifications.tsx apps/web/src/pages/user/SkinJournal.tsx apps/web/src/pages/user/Appointments.tsx apps/web/src/pages/user/Referrals.tsx apps/web/src/pages/user/BookingWizard.tsx
git commit -m "style: update hardcoded colors in user pages"
```

---

### Task 5: Update remaining components and utilities

**Files:**
- Modify: `apps/web/src/components/ui/ServiceCard.tsx`
- Modify: `apps/web/src/components/appointments/FollowUpReminderWidget.tsx`
- Modify: `apps/web/src/components/achievements/BadgesGrid.tsx`
- Modify: `apps/web/src/utils/generateShareImage.ts`

- [ ] **Step 1: Fix ServiceCard.tsx**

In `apps/web/src/components/ui/ServiceCard.tsx`:

| Find | Replace |
|------|---------|
| `color: '#C4A882'` | `color: '#3D7A54'` |

- [ ] **Step 2: Fix FollowUpReminderWidget.tsx**

In `apps/web/src/components/appointments/FollowUpReminderWidget.tsx`:

| Find | Replace |
|------|---------|
| `backgroundColor: '#FFFBF5'` | `backgroundColor: '#F4F9F5'` |
| `rgba(184,145,58,` | `rgba(196,150,90,` |

- [ ] **Step 3: Fix BadgesGrid.tsx**

In `apps/web/src/components/achievements/BadgesGrid.tsx`:

| Find | Replace |
|------|---------|
| `rgba(245,240,235,` | `rgba(232,243,234,` |

- [ ] **Step 4: Fix generateShareImage.ts**

In `apps/web/src/utils/generateShareImage.ts`:

| Find | Replace |
|------|---------|
| `'#B8913A'` | `'#C4965A'` |

- [ ] **Step 5: Final audit — verify no old palette colors remain anywhere in src/**

```bash
grep -rn "#1C1510\|#6B5A4E\|#8C6A4A\|#C4A882\|#FAF7F2\|#F0EBE3\|#B8913A\|#2a1f15\|rgba(184,145,58\|rgba(196,168,130\|rgba(28,21,16\|rgba(26,18,8\|rgba(245,240,235\|#FFFBF5" cosmo-app/apps/web/src/
```
Expected: no output. If any matches remain, fix them before proceeding.

- [ ] **Step 6: Final TypeScript build verification**

```bash
cd cosmo-app/apps/web && pnpm build
```
Expected: exits 0, zero errors.

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/ui/ServiceCard.tsx apps/web/src/components/appointments/FollowUpReminderWidget.tsx apps/web/src/components/achievements/BadgesGrid.tsx apps/web/src/utils/generateShareImage.ts
git commit -m "style: update hardcoded colors in components and utilities — botanical redesign complete"
```
