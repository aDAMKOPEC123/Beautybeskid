# Admin Client Statistics — Design Spec

**Date:** 2026-05-13
**Status:** Approved
**Scope:** `apps/server/src/modules/users/users.service.ts` + `apps/web/src/pages/admin/Users.tsx`

---

## Overview

Enhance the admin `UserDetailsModal` to show financial statistics and richer visit history per client. No new pages, routes, or files — only the existing modal and its backend endpoint are modified.

---

## Backend Changes

### `getUserDetails(id)` in `users.service.ts`

**Add `employee` to the appointments select:**

```ts
employee: { select: { id: true, name: true } }
```

**Compute derived stats in JS after the single Prisma query (no extra DB calls):**

| Field | Computation |
|---|---|
| `totalSpent` | Sum of `service.price` for all `COMPLETED` appointments |
| `avgPerVisit` | `totalSpent / completedCount` (0 if no completed visits) |
| `mostFrequentService` | Mode of `service.name` across `COMPLETED` appointments; `null` if none |
| `pointsEarned` per appointment | Reuse prefix-matching logic from `getUserTimeline`: match loyalty transactions with `EARN` type whose description starts with `"Punkty za wizyte: <serviceName>"` to the corresponding appointment |

**Points mapping algorithm** (inline copy within `getUserDetails` — do not refactor `getUserTimeline`):
1. Filter `loyaltyTransactions` by type `EARN` and prefix pattern
2. For each transaction, extract service name from description
3. Match to first unmatched completed appointment with that service name
4. Attach `pointsEarned: number | null` to each appointment object

**`loyaltyTransactions` cap:** The current `getUserDetails` query fetches only `take: 20` transactions. Remove this cap (`take` omitted) for the details endpoint so that all EARN transactions are available for matching — ensuring `pointsEarned` is accurate even for clients with many visits.

**Routing note:** `GET /users/:id` is already handled by `getUserDetails()` (confirmed in `users.router.ts`). The frontend modal already calls `api.get('/users/${userId}')` which hits this route. No URL change needed.

**Return shape:** The existing `allAppointments` array returned by `getUserDetails()` is augmented in-place — each element gains `employee` and `pointsEarned` fields. A new top-level `stats` object is added alongside it. No new array keys are introduced.

```ts
{
  ...existingFields,
  stats: {
    totalSpent: number,
    avgPerVisit: number,
    mostFrequentService: string | null,
  },
  // Same key as before — elements enriched in-place:
  allAppointments: Array<{
    ...existingFields,
    employee: { id: string, name: string } | null,
    pointsEarned: number | null,
  }>
}
```

---

## Frontend Changes

### `UserDetailsModal` in `Users.tsx`

#### Stats Grid (replaces current 4-card grid)

Layout: 3-column CSS grid, 3 rows.

**Row 1:**
- Wydano łącznie — `stats.totalSpent` in PLN, green color accent
- Wizyty łącznie — `allAppointments.length`, with sub-text for upcoming count
- Średnia za wizytę — `stats.avgPerVisit` PLN; if 0 completed visits, show `"—"` as value with muted style

**Row 2:**
- Ostatnia wizyta — date + service name (existing)
- Konto założone — date + age string (existing)
- Tier / Punkty — loyalty tier badge + points (existing)

**Row 3 (full width, single card):**
- Najczęstsza usługa — `stats.mostFrequentService` with subtle highlight; entire card hidden (not rendered) if `null`, so the grid renders as 3+3 or 3+3+1 depending on data

#### Visit History Rows (replaces current flat list)

Each appointment renders as an expanded card:

**All visits:**
- Header line: service name (bold) + status badge (right)
- Sub-line: date/time + employee name (if present)

**COMPLETED visits additionally show:**
- Price row: `Cena usługi: X zł` (green)
- Points row: `+N pkt` (purple/violet), only if `pointsEarned` is not null

**CANCELLED / PENDING / CONFIRMED visits:**
- No price or points shown
- Row has reduced opacity or subtle grey background to visually distinguish
- Status badge uses existing `STATUS_COLORS` mapping

**Notes** (if `a.notes` exists): shown as italic quote below the price/points row.

---

## What Is NOT Changing

- Modal structure, header, close button
- Kartoteka klienta section (allergy/notes fields)
- Zgody section
- Zaplanowane wizyty section
- Dziennik Kosmetologa section
- All existing API routes and endpoints
- No new database migrations needed (`service.price` already exists on the `Service` model)

---

## Constraints

- All financial stats are computed in JS from data already fetched — no extra Prisma queries
- `mostFrequentService` is hidden (not rendered) when `null` — no placeholder shown
- Cancelled appointments are visible but visually muted — admin needs full history
- `avgPerVisit` denominator is COMPLETED visit count only (not all visits)
