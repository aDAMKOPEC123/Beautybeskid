# Employee Week-by-Week Schedule Editor

**Date:** 2026-06-26
**Status:** Approved

## Problem

Current employee schedule has two layers:
1. Weekly template (repeating pattern per day-of-week)
2. WorkDay overrides (day-specific exceptions)

Availability logic falls back to the weekly template when no WorkDay exists — meaning employees are "available by default". The user wants the opposite: **no configuration = unavailable**.

## Goal

- Employee edits availability week by week (not via a repeating template)
- Default = unavailable; employee must explicitly open each week and set working days/hours
- Month blocking: one click to mark an entire month as unavailable
- Clients still see the standard monthly booking calendar (unchanged)

## Approach

Use existing `EmployeeWorkDay` model (no DB migration needed). Remove weekly template fallback from availability logic. Add bulk operations.

## Backend Changes

### 1. `employees.service.ts` — remove weekly template fallback

In `getAvailabilityForDuration`, when no `workDay` exists for the date:

```
// BEFORE: falls back to weekly schedule
if (!weekly) return [];
blocks = weekly.timeBlocks;

// AFTER: no workDay = unavailable
return [];
```

Weekly schedule records remain in the DB but no longer affect availability.

### 2. New service functions

**`upsertWeek(employeeId, days[])`**
- Bulk upsert up to 7 WorkDays at once
- Each item: `{ date, isWorking, timeBlocks?, note? }`

**`blockMonth(employeeId, year, month)`**
- Creates WorkDay with `isWorking: false` for every day in the month (upsert)

### 3. New routes

```
POST /employees/me/schedule/week        — bulk save a week
POST /employees/me/schedule/block-month — block entire month
```

Admin equivalents:
```
POST /employees/:id/schedule/week
POST /employees/:id/schedule/block-month
```

### 4. `employees.controller.ts`

Two new handlers calling the new service functions.

### 5. `employees.router.ts`

Register the two new routes (before `/:id` catch-all).

### 6. `employees.api.ts`

```ts
upsertMyWeek(days: WeekDayInput[]): Promise<WorkDay[]>
blockMyMonth(year: number, month: number): Promise<void>
```

## Frontend Changes

### `Schedule.tsx` — complete rewrite

**Remove:**
- `WeeklyTemplateSection` component
- `DayOverridePanel` component (inline editing replaces it)

**New structure:**

```
WeekNavigator        — prev/next week, header "Pn 30 cze – Nd 6 lip 2026"
BlockMonthButton     — top-right, opens confirmation modal
WeekDayEditor        — 7 rows (Mon–Sun), each with:
  - date header
  - Pracuję / Wolne toggle
  - TimeBlocksEditor (existing component) when isWorking=true
SaveWeekButton       — single POST to /me/schedule/week
```

**Behavior:**
- Load: `getMySchedule(month)` for the month(s) containing the current week
- If week spans two months: load both months, merge WorkDays
- Past weeks: read-only (toggles disabled, no Save button)
- Banner: "Ten tydzień nie ma żadnych wpisów — klienci widzą brak terminów" when no WorkDays exist for the week
- Save button saves all 7 days (even days marked as Wolne get a WorkDay record)
- Block month: modal confirmation → POST block-month → refetch

**Client-facing calendar (BookingWizard):** no changes. Days without WorkDay records will now show as `off` instead of inheriting the weekly template.

## Non-goals

- No changes to weekly schedule model (kept in DB, just ignored)
- No admin UI changes for employee schedule management (out of scope)
- No changes to BookingWizard UI
