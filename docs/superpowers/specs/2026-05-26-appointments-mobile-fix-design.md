# Appointments Mobile Fix — Design Spec
Date: 2026-05-26
File: `apps/web/src/pages/user/Appointments.tsx`

## Problem

On narrow mobile screens the `AppointmentCard` layout overflows. The card header uses `flex-row justify-between` with a `shrink-0` right column (status badge + "Zmień termin" button), which leaves too little horizontal space for the left column (service name, date, price, employee). Text is cramped or wraps awkwardly.

Additionally, the "Historia" section renders all past appointments unconditionally, making the page visually heavy.

## Changes

### 1. AppointmentCard — Responsive Layout

**Mobile (< `sm`, i.e. < 640px) — new structure:**

The card header (`p-5` div) changes from `flex-row` to a vertical stack:

```
[Mobile top row]  flex justify-between
  Left: "Nadchodząca wizyta" / "Przeszła wizyta" label
  Right: status badge pill
[Info block]  full width
  service name, price, date, employee
[Button row]  only when canReschedule === true
  "Zmień termin" / "Zmiana w toku..." button — w-full
  Disabled state (rescheduleStatus === 'PENDING') and ternary label apply identically to the mobile copy.
  When canReschedule === false: no button row renders; no placeholder needed.
```

**Desktop (`sm:` and up) — existing structure preserved:**

```
[flex-row justify-between items-start gap-4]
  Left (space-y-1): label + service name + price + date + employee
  Right (flex-col items-end gap-2 shrink-0): status badge + optional button
```

**Implementation approach — JSX duplication with responsive hiding:**

The status badge and "Zmień termin" button each appear in two JSX locations:
- **Mobile copy**: inside the new mobile-only top row / button row. These elements get `className="sm:hidden"` (or are wrapped in a `sm:hidden` container).
- **Desktop copy**: inside the existing right column div, which gets `className="hidden sm:flex flex-col items-end gap-2 shrink-0"`.

No logic is duplicated — only JSX structure. Both copies of the button must include `disabled={a.rescheduleStatus === 'PENDING'}` and the ternary label `{a.rescheduleStatus === 'PENDING' ? 'Zmiana w toku...' : 'Zmień termin'}`.

**Import change required:** Add `ChevronDown` to the lucide-react import on line 6. It is NOT currently present in the file.

### 2. Historia Section — Collapsible Accordion

- Add `const [historyOpen, setHistoryOpen] = useState(false)` — default collapsed.
- The section `<h2>` becomes a `<button type="button">` spanning full width (`w-full flex items-center justify-between`), carrying over the existing color: `style={{ color: 'rgba(20,40,28,0.5)' }}`.
  - Left: "Historia" text (same `text-lg font-semibold` as current `<h2>`) + count pill: `<span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(20,40,28,0.5)' }}>{past.length}</span>`
  - Right: `ChevronDown` icon with Tailwind classes `transition-transform duration-200` and `rotate-180` applied conditionally when `historyOpen === true`.
- The card list renders only when `historyOpen === true`. The existing `opacity-75` class on the grid wrapper is preserved.

## Constraints

- No changes to backend, API, or data fetching logic.
- No changes to `RescheduleModal`, `ReviewForm`, `FollowUpReminderWidget`.
- Desktop layout must remain visually identical to current.
- Use Tailwind utility classes for all transitions and layout (no inline style for transitions).

## Success Criteria

1. On 375px viewport: all card text is fully readable, no overflow, "Zmień termin" button is full-width and tappable.
2. On 640px+ viewport: card layout is visually identical to before this change.
3. "Historia" section starts collapsed; clicking header expands/collapses with chevron rotation animation.
4. TypeScript check passes: run `cd cosmo-app/apps/web && pnpm tsc --noEmit` with zero errors.
