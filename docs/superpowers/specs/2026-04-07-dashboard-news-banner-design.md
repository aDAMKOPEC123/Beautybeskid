# Design Spec: DashboardNewsBanner

**Date:** 2026-04-07
**Status:** Draft

---

## Context

When a logged-in client enters their panel (`/user/*`), they currently have no visibility into salon news, promotions, or new services. The public hero slider on the homepage already contains this content (managed by admin), but it's not surfaced inside the panel. The goal is to display the same hero slides inside the user dashboard — immediately below the greeting strip — so users staying within the panel stay informed about what's happening in the salon.

---

## Placement

**Where:** User Dashboard (`/user`) — between the greeting hero strip and the welcome coupon / quick-action chips.

Specifically, insert `<DashboardNewsBanner />` after the `{/* Hero strip */}` block and before the `{welcomeCoupon && ...}` block in `Dashboard.tsx`.

**Why here:** Maximum visibility on first load without disrupting the functional flow (booking, loyalty, series) below.

---

## Component: `DashboardNewsBanner`

### File
`apps/web/src/components/dashboard/DashboardNewsBanner.tsx`

### Data source
Reuses the existing public API endpoint via `heroApi.getSlides()` (`GET /hero`) — returns active slides ordered by `isMain` desc, then `order` asc.

**React Query config:**
```ts
useQuery({
  queryKey: ['hero-slides'], // matches HeroSlider.tsx + admin invalidations
  queryFn: heroApi.getSlides,
  staleTime: 5 * 60 * 1000, // 5 minutes — hero slides are low-churn
})
```

No backend changes required.

### Slide fields used

| Field | Used | Notes |
|---|---|---|
| `id` | ✓ | React key |
| `imagePath` | ✓ | CSS `background-image` |
| `heading` | ✓ | Primary text; if `null`, subtitle still shown; if both null, text block hidden |
| `title` | ✗ | Intentionally ignored — `title` is SEO metadata, `heading` is display text |
| `subtitle` | ✓ | Secondary text; if `null`, omitted |
| `buttons[]` | ✓ | CTA buttons; if `null`, `undefined`, or `[]`, no buttons rendered |
| `textPosition` | ✗ | Intentionally ignored — banner always uses bottom-left layout |
| `fontStyle` | ✗ | Intentionally ignored — banner uses app panel typography |
| `order`, `isMain`, `isActive` | ✗ | Controlled server-side via `getSlides()` ordering |

### Visual design
- **Height:** 160px fixed
- **Background:** slide's `imagePath` as `object-cover` CSS background image
- **Overlay:** `linear-gradient(to right, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.15) 100%)` — ensures text legibility on any image
- **Text (bottom-left, `padding: 14px 16px`):**
  - Label: `✦ Nowości & Aktualności` — 8px, `#B8913A`, uppercase, letter-spacing 0.22em
  - `heading` — 14px (mobile) / 16px (desktop), white, bold; hidden if null
  - `subtitle` — `text-[9px]`, `rgba(255,255,255,0.6)`; hidden if null
- **CTA buttons** from `buttons[]`:
  - `variant: "default"` → gold filled pill (`background: #B8913A`, white text)
  - `variant: "outline"` → outlined pill (`border: 1px solid rgba(255,255,255,0.4)`, white text)
  - Link behaviour: if `href` starts with `/` → React Router `<Link to={href}>` (SPA navigation); otherwise → `<a href={href} target="_blank" rel="noopener noreferrer">` (external)
- **Navigation (hidden when slide count ≤ 1):**
  - Left/right chevron buttons: 24×24px circular, `background: rgba(255,255,255,0.12)`, `border: 1px solid rgba(255,255,255,0.2)`, `aria-label="Poprzedni slajd"` / `"Następny slajd"`
  - Vertical dot indicators on right edge — active dot `#B8913A`, inactive `rgba(255,255,255,0.28)`
  - Navigation wraps around: last slide → next → first slide; first slide → prev → last slide
- Vertical dot indicators on right edge:
  - Each dot is a `<button>` element (`6×6 px`, `border-radius: 50%`, gap `5px`)
  - Active dot: `#B8913A`; inactive: `rgba(255,255,255,0.28)`
  - `aria-label="Przejdź do slajdu N"` (1-indexed)
  - Clicking a dot navigates directly to that slide index and resets autoplay timer
- **Autoplay:**
  - 5-second interval using `setInterval` in `useEffect`
  - `useEffect` cleanup (`clearInterval`) on unmount — prevents memory leaks
  - Paused on `onMouseEnter` / `onTouchStart` on the outer container
  - Resumed on `onMouseLeave` / `onTouchEnd` on the outer container
  - Resume is immediate (no debounce needed for this use case)

### Accessibility
- Outer `<section>` with `aria-label="Nowości i aktualności"`
- Prev/next `<button>` elements with `aria-label="Poprzedni slajd"` / `"Następny slajd"`
- Active dot indicator: `aria-current="true"` on the active dot element
- CTA buttons/links: natural accessible text from `label` field

### Responsive behaviour
- **Mobile (< 768px):** full width within `<main>`, 160px height
- **Desktop (≥ 768px):** full width within the main content column (sidebar is separate, unaffected), 160px height

### Edge cases

| State | Behaviour |
|---|---|
| 0 active slides | Component returns `null` — section invisible |
| 1 active slide | Rendered normally; nav arrows + dots hidden |
| `heading` and `subtitle` both null | Text block hidden; banner still shows image + buttons if present |
| `buttons` is null/undefined/empty | No button row rendered |
| Loading | Skeleton: `160px` gray block with Tailwind `animate-pulse` |
| Image load error | Dark gradient fallback visible via overlay; no broken image icon |

---

## Integration point

**File to modify:** `apps/web/src/pages/user/Dashboard.tsx`

Insert the new component after the greeting hero strip, before the welcome coupon block. Use the existing JSX comment landmarks as reference:

```tsx
{/* Section 1: Hero strip */}
<div ...>...</div>

{/* NEW — insert here */}
<DashboardNewsBanner />

{/* Welcome coupon (shown above quick chips if present) */}
{welcomeCoupon && (
  <div ...>...</div>
)}

{/* Section 2: Quick-action chips */}
<div ...>...</div>
```

---

## What is NOT changing

- `HeroSlider.tsx` — untouched
- `Navbar.tsx` — untouched
- Backend — no new endpoints; reuses `GET /hero`
- `UserLayout.tsx` — no changes needed
- All other dashboard sections remain in place

---

## Verification

1. `cd cosmo-app && pnpm dev` — start dev server
2. Log in as a regular user, navigate to `/user`
3. Confirm new banner appears below greeting strip, above welcome coupon/quick-action chips
4. Confirm slide image, heading, subtitle, and buttons match what admin configured in `/admin/hero`
5. Confirm autoplay advances slides every ~5 seconds
6. Confirm prev/next arrows work, including wrap-around (last → next → first, first → prev → last)
7. Confirm dot indicators update with current slide; clicking a dot changes slide
8. Confirm hover pauses autoplay; mouse leave resumes it
9. Confirm CTA buttons: internal `/` links navigate via SPA (no full reload); external links open in new tab
10. **0 active slides:** disable all slides in admin → confirm section invisible on dashboard
11. **1 active slide:** enable only one slide → confirm arrows and dots are hidden
12. Check mobile (≤ 768px): banner fills full width at 160px, text readable, buttons accessible
13. Check desktop (≥ 768px): banner fills main content area, sidebar unaffected
14. `cd apps/web && npx tsc --noEmit` — no TypeScript errors
