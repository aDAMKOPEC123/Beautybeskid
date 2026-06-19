# Booking Conversion Features — Design Spec
**Date:** 2026-04-07
**Status:** Approved
**Scope:** Increase booking conversion for logged-in users via urgency, personalisation, and timely reminders

---

## Overview

Three features targeting logged-in users who have accounts but rarely book:

1. **Sezonowe rekomendacje** — Seasonal service recommendations on homepage (logged-in only)
2. **Licznik wolnych terminów** — Available slots counter with urgency indicator on homepage
3. **Reminder po ostatniej wizycie** — Follow-up reminder in user panel when it's time to rebook

---

## Feature 1: Sezonowe rekomendacje (Seasonal Recommendations)

### Goal
Show logged-in users personalised service recommendations based on the current season, directly on the homepage.

### Backend Changes

**Prisma — `Service` model:**
- Add `seasons Season[] @default([])` — array of season enums with empty default so existing rows are not NULL
- New enum: `Season { SPRING SUMMER AUTUMN WINTER }`

**Migration:** Single migration covering F1 + F2 (no new fields for F2): `add-service-seasons`

**API:** No new endpoint needed. Existing `GET /api/services` response already returns the full service object; Prisma select updated to include `seasons`.

### Season Detection (Frontend)

Uses `new Date().getMonth()` — browser local time, intentional (salon is a single local business):
- Months 2–4 (March–May) → `SPRING`
- Months 5–7 (June–August) → `SUMMER`
- Months 8–10 (September–November) → `AUTUMN`
- Months 11, 0, 1 (December–February) → `WINTER`

### Frontend Changes

**`Home.tsx`:**
- New section inserted between "Bento grid" and "Testimonials", visible only when `isAuthenticated`
- Filters services where `s.isActive === true && s.seasons.includes(currentSeason)`
- Displays up to 3 services; when more than 3 match, take the first 3 sorted by `name` alphabetically (deterministic, predictable for admins)
- Each card: service name, price, CTA → `/rezerwacja?serviceId={id}`
- Section hidden entirely if no active services tagged for current season

**`AdminServiceDetail.tsx`:**
- New "Sezonowość" section with 4 checkboxes: Wiosna / Lato / Jesień / Zima
- Maps to `seasons` array sent in PATCH request

**`packages/shared/src/service.types.ts`:**
- Add `Season` enum: `export enum Season { SPRING = 'SPRING', SUMMER = 'SUMMER', AUTUMN = 'AUTUMN', WINTER = 'WINTER' }`
- Extend `Service` type with `seasons: Season[]`
- Update `updateServiceSchema` Zod schema to accept `seasons?: Season[]`
- Re-export `Season` from `packages/shared/src/index.ts`

---

## Feature 2: Licznik wolnych terminów (Available Slots Counter)

### Goal
Show a count of remaining slots this week on the homepage hero, creating urgency for all visitors (logged-in and anonymous).

### Backend Changes

**New endpoint:** `GET /api/employees/week-slots-count`
**Auth:** Public (no token required)
**Returns:** `{ count: number, weekStart: string, weekEnd: string }`

**Implementation — optimised single-query approach** (avoids per-employee-per-day loops):
1. Compute `weekStart` (Monday 00:00) and `weekEnd` (Sunday 23:59) of the current ISO week
2. Query `EmployeeWorkDay` joined with `EmployeeWeeklySchedule` to get all scheduled work intervals for active employees this week → total available minutes
3. Query `Appointment` where `date BETWEEN weekStart AND weekEnd AND status IN (PENDING, CONFIRMED)` to get booked minutes
4. Convert remaining minutes to slot count using a fixed slot granularity of 30 minutes (consistent with the existing `getAvailability` logic)
5. Return `count = Math.max(0, Math.floor(remainingMinutes / 30))`

This is 2–3 database queries total regardless of employee count.

**Route placement in `employees.router.ts`:** Register `GET /week-slots-count` **before** any `/:id` parameterised routes to prevent Express matching the literal string as an ID.

**Caching:** No server-side cache required given the 2–3 query approach. Frontend uses `staleTime: 5 * 60_000`.

### Frontend Changes

**`Home.tsx`:**
- New query: `employeesApi.getWeekSlotsCount()`
- Displayed inside the existing "Najbliższy termin" card, below the appointment time:
  - `count > 5`: muted text — *"Wolnych terminów w tym tygodniu: {count}"*
  - `2 < count ≤ 5`: amber — *"⚡ Zostało tylko {count} wolnych terminów!"*
  - `1 ≤ count ≤ 2`: red — *"🔴 Ostatnie {count} miejsce w tym tygodniu!"*
  - `count === 0`: widget hidden (no dead-end message); existing CTA ("Umów wizytę") remains visible so user can browse future weeks in BookingWizard
- On API error: widget hidden silently (no broken state shown)

**`employees.api.ts`:**
- Add `getWeekSlotsCount(): Promise<{ count: number; weekStart: string; weekEnd: string }>`

---

## Feature 3: Reminder po ostatniej wizycie (Follow-up Reminder)

### Goal
Remind logged-in users in their panel when it's time to rebook a service based on the service's existing `recommendedIntervalDays` field.

### No New Schema Fields Required
The `Service` model already has `recommendedIntervalDays Int?` used by the `treatment-series` module. Feature 3 reuses this field — no migration needed for F3.

Admin already sets "Interwał między wizytami" in `AdminServiceDetail.tsx`. No UI changes needed for F3.

### Backend Changes

**New endpoint:** `GET /api/appointments/follow-up-reminders`
**Auth:** Required — inherits `authenticate` middleware already applied via `router.use(authenticate)` at the top of `appointments.router.ts`

**Route placement:** Register before any `/:id` parameterised routes (e.g., `/:id/reschedule`) to avoid Express matching the literal string as an appointment ID.

**Returns:** `FollowUpReminder[]` sorted by `daysOverdue` descending

```ts
interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;        // ISO date
  recommendedReturnDate: string; // lastVisitDate + recommendedIntervalDays
  daysOverdue: number;           // today - recommendedReturnDate (calendar days; positive = overdue, 0 = due today, negative = early warning)
}
```

**Logic:**
1. Fetch authenticated user's `COMPLETED` appointments that have `service.recommendedIntervalDays != null`, grouped by `serviceId` — take only the most recent per service
2. Compute `triggerDate = lastVisitDate + Math.floor(recommendedIntervalDays * 0.85)` days
   - Rationale: 0.85 gives ~15% advance notice (e.g., 21-day service triggers at day 18 — reminder appears 3 days before the recommended return date)
   - `Math.floor` ensures an integer number of days
3. Return only entries where `today >= triggerDate`
4. `daysOverdue = differenceInCalendarDays(today, recommendedReturnDate)` — negative means early warning, positive means overdue, 0 means due today
5. Sort by `daysOverdue` descending (most overdue first)

### Frontend Changes

**New component:** `apps/web/src/components/appointments/FollowUpReminderWidget.tsx`

**Placement:** Rendered at the top of `apps/web/src/pages/user/Appointments.tsx`, above the appointments list

**Behaviour:**
- Query: `appointmentsApi.getFollowUpReminders()`
- If empty result or error: component renders nothing
- If results: show stacked cards (max 3 visible, rest hidden)
- Each card:
  - Title: *"Czas na odnowienie — [nazwa usługi]"*
  - Subtitle: `daysOverdue > 0` → *"Minęło {daysOverdue} dni od zalecanego powrotu"* / `daysOverdue <= 0` → *"Zalecany termin: [recommendedReturnDate]"*
  - CTA: *"Zarezerwuj wizytę →"* → `/rezerwacja?serviceId={serviceId}`
  - Dismiss button (×): hides the card for the current session only
- Dismissal: `sessionStorage` key `cosmo-reminder-dismissed-{serviceId}` — cleared automatically on browser close; no expiry management needed

**`appointments.api.ts`:**
- Add `getFollowUpReminders(): Promise<FollowUpReminder[]>`

---

## Data Model Summary

```prisma
enum Season {
  SPRING
  SUMMER
  AUTUMN
  WINTER
}

model Service {
  // ... existing fields including recommendedIntervalDays Int? (unchanged) ...
  seasons Season[] @default([])
}
```

**Single migration:** `add-service-seasons` — adds the `Season` enum and `seasons` field only.

---

## Shared Package Updates (`packages/shared/src/service.types.ts`)

- Add and export `Season` enum
- Extend `Service` type with `seasons: Season[]`
- Update `updateServiceSchema` Zod with `seasons: z.array(z.nativeEnum(Season)).optional()`
- Re-export `Season` from `packages/shared/src/index.ts`

---

## Out of Scope

- Push notifications for follow-up reminders (existing `push` module can be added later)
- Email reminders
- Automatic season detection based on geolocation or hemisphere
- A/B testing of urgency thresholds
- Persistent (cross-session) dismissal of follow-up reminder cards
