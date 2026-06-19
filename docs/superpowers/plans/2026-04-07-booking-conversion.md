# Booking Conversion Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to increase booking conversion — seasonal service recommendations on the homepage, a weekly available-slots urgency counter, and a follow-up reminder widget in the user appointments panel.

**Architecture:** Feature 1 adds a `Season` enum + `seasons` array to the `Service` model and renders a personalised recommendation section on the homepage for logged-in users. Feature 2 adds a new optimised public endpoint that counts free slots this week and shows urgency copy in the hero. Feature 3 reuses the existing `recommendedIntervalDays` field to surface a "time to rebook" widget in the user panel — no schema changes needed beyond F1.

**Tech Stack:** Prisma + PostgreSQL (migration), Express 5 / TypeScript (backend), React 19 + TanStack Query + TypeScript (frontend), Zod (shared validation), Vitest (backend unit tests)

---

## File Map

### Created
- `cosmo-app/apps/server/src/modules/employees/employees.weekslots.test.ts` — unit tests for `getWeekSlotsCount`
- `cosmo-app/apps/server/src/modules/appointments/appointments.followup.test.ts` — unit tests for `getFollowUpReminders`
- `cosmo-app/apps/web/src/components/appointments/FollowUpReminderWidget.tsx` — follow-up reminder UI component

### Modified
- `cosmo-app/apps/server/prisma/schema.prisma` — add `Season` enum + `seasons Season[] @default([])` to `Service`
- `cosmo-app/packages/shared/src/types/service.types.ts` — add `Season` enum + `seasons` to `Service` interface
- `cosmo-app/packages/shared/src/schemas/service.schema.ts` — add `seasons` to Zod schemas
- `cosmo-app/packages/shared/src/index.ts` — re-export `Season`
- `cosmo-app/apps/server/src/modules/employees/employees.service.ts` — add `getWeekSlotsCount()`
- `cosmo-app/apps/server/src/modules/employees/employees.controller.ts` — add `getWeekSlotsCount` handler
- `cosmo-app/apps/server/src/modules/employees/employees.router.ts` — register `GET /week-slots-count` before `/:id` routes
- `cosmo-app/apps/server/src/modules/appointments/appointments.service.ts` — add `getFollowUpReminders(userId)`
- `cosmo-app/apps/server/src/modules/appointments/appointments.controller.ts` — add `getFollowUpReminders` handler
- `cosmo-app/apps/server/src/modules/appointments/appointments.router.ts` — register `GET /follow-up-reminders` before `/:id` routes
- `cosmo-app/apps/server/src/modules/services/services.service.ts` — include `seasons` in select/return
- `cosmo-app/apps/web/src/api/employees.api.ts` — add `getWeekSlotsCount()`
- `cosmo-app/apps/web/src/api/appointments.api.ts` — add `getFollowUpReminders()`
- `cosmo-app/apps/web/src/pages/public/Home.tsx` — seasonal recommendations section + slots counter
- `cosmo-app/apps/web/src/pages/user/Appointments.tsx` — render `FollowUpReminderWidget` at top
- `cosmo-app/apps/web/src/pages/admin/AdminServiceDetail.tsx` — add seasons checkboxes

---

## Task 1: Prisma schema + shared types

**Files:**
- Modify: `cosmo-app/apps/server/prisma/schema.prisma`
- Modify: `cosmo-app/packages/shared/src/types/service.types.ts`
- Modify: `cosmo-app/packages/shared/src/schemas/service.schema.ts`
- Modify: `cosmo-app/packages/shared/src/index.ts`

- [ ] **Step 1: Add Season enum and seasons field to Prisma schema**

Open `cosmo-app/apps/server/prisma/schema.prisma`. Add the `Season` enum near the other enums (e.g., after the `AppointmentStatus` enum block):

```prisma
enum Season {
  SPRING
  SUMMER
  AUTUMN
  WINTER
}
```

Then add `seasons Season[] @default([])` to the `Service` model, after `seriesIntervalsDays`:

```prisma
  seriesIntervalsDays     Int[]    @default([])
  seasons                 Season[] @default([])
```

- [ ] **Step 2: Run migration**

```bash
cd cosmo-app/apps/server && npx prisma migrate dev --name add-service-seasons
```

Expected: migration file created, DB updated, no errors.

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd cosmo-app/apps/server && npx prisma generate
```

Expected: `@prisma/client` regenerated with `Season` enum available.

- [ ] **Step 4: Add Season enum to shared types**

In `cosmo-app/packages/shared/src/types/service.types.ts`, add the enum and extend the interface:

```typescript
export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER',
}

export interface Service {
  // ... existing fields ...
  seasons: Season[];
}
```

- [ ] **Step 5: Add seasons to Zod schemas**

In `cosmo-app/packages/shared/src/schemas/service.schema.ts`, add to `serviceSchemaBase`:

```typescript
import { Season } from '../types/service.types';

// inside serviceSchemaBase:
seasons: z.array(z.nativeEnum(Season)).default([]),
```

- [ ] **Step 6: Re-export Season from shared index**

`cosmo-app/packages/shared/src/index.ts` already exports `./types/service.types` — `Season` will be exported automatically. No change needed unless `Season` lives in a new file.

Verify by checking that the existing `export * from './types/service.types'` line is present.

- [ ] **Step 7: Build shared package to confirm no TypeScript errors**

```bash
cd cosmo-app/packages/shared && pnpm build
```

Expected: exits 0, no TS errors.

- [ ] **Step 8: Commit**

```bash
cd cosmo-app
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations packages/shared/src/types/service.types.ts packages/shared/src/schemas/service.schema.ts
git commit -m "feat: add Season enum to Service model and shared types"
```

---

## Task 2: Backend — include `seasons` in services responses

**Files:**
- Modify: `cosmo-app/apps/server/src/modules/services/services.service.ts`

The `getAllServices` and `getServiceBySlug` functions need to include `seasons` in the Prisma select/return. Prisma auto-includes all scalar fields, so `seasons` will be returned automatically after regeneration. Verify by reading the existing service functions and confirming there is no explicit `select` that would exclude `seasons`.

- [ ] **Step 1: Check for explicit selects in services.service.ts**

Read `cosmo-app/apps/server/src/modules/services/services.service.ts` and search for any `select: { ... }` blocks on `service.findMany` or `service.findUnique`. If explicit selects exist that don't include `seasons`, add `seasons: true` to each.

If only `include:` or full model returns are used (no select), no changes needed — Prisma returns all scalar fields including arrays.

- [ ] **Step 2: Build backend to confirm no errors**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/services/
git commit -m "feat: expose seasons field in services API responses"
```

---

## Task 3: Backend — `GET /api/employees/week-slots-count`

**Files:**
- Modify: `cosmo-app/apps/server/src/modules/employees/employees.service.ts`
- Modify: `cosmo-app/apps/server/src/modules/employees/employees.controller.ts`
- Modify: `cosmo-app/apps/server/src/modules/employees/employees.router.ts`
- Create: `cosmo-app/apps/server/src/modules/employees/employees.weekslots.test.ts`

- [ ] **Step 1: Write the failing test**

Create `cosmo-app/apps/server/src/modules/employees/employees.weekslots.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the pure calculation logic, not the DB call.
// Extract the calculation into a helper so it can be unit-tested.

import { calculateWeekSlotsCount } from './employees.service';

describe('calculateWeekSlotsCount', () => {
  it('returns 0 when no scheduled minutes', () => {
    expect(calculateWeekSlotsCount(0, 0)).toBe(0);
  });

  it('divides remaining minutes by 30', () => {
    // 480 scheduled minutes, 120 booked → 360 remaining → 12 slots
    expect(calculateWeekSlotsCount(480, 120)).toBe(12);
  });

  it('floors partial slots', () => {
    // 490 scheduled, 120 booked → 370 remaining → 12.33 → floor → 12
    expect(calculateWeekSlotsCount(490, 120)).toBe(12);
  });

  it('returns 0 when booked >= scheduled', () => {
    expect(calculateWeekSlotsCount(60, 60)).toBe(0);
    expect(calculateWeekSlotsCount(60, 90)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: FAIL — `calculateWeekSlotsCount` not exported.

- [ ] **Step 3: Implement `calculateWeekSlotsCount` and `getWeekSlotsCount` in employees.service.ts**

Add at the bottom of `cosmo-app/apps/server/src/modules/employees/employees.service.ts`.

Note: `SLOT_INTERVAL_MINUTES = 30` is already defined at line 8 of the file — reuse it, do NOT define a new constant.

```typescript
// Pure helper — exported for unit testing
export function calculateWeekSlotsCount(scheduledMinutes: number, bookedMinutes: number): number {
  const remaining = Math.max(0, scheduledMinutes - bookedMinutes);
  return Math.floor(remaining / SLOT_INTERVAL_MINUTES);
}

export const getWeekSlotsCount = async (): Promise<{
  count: number;
  weekStart: string;
  weekEnd: string;
}> => {
  const now = new Date();
  // Monday of current ISO week
  const day = now.getUTCDay(); // 0=Sun,1=Mon,...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  // Query 1: sum day-specific overrides this week
  const workDayOverrides = await prisma.employeeWorkDay.findMany({
    where: {
      employee: { isActive: true },
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { isWorking: true, timeBlocks: true, employeeId: true, date: true },
  });

  // Build a set of (employeeId, dayOfWeek) pairs that have overrides
  // so we don't double-count override days vs weekly template days
  const overriddenKeys = new Set(
    workDayOverrides.map((d) => {
      const dow = (d.date.getUTCDay() + 6) % 7; // 0=Mon
      return `${d.employeeId}-${dow}`;
    })
  );

  // Sum minutes from weekly schedule (skip days that have an override)
  let scheduledMinutes = 0;

  const allEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, weeklySchedule: { where: { isWorking: true }, select: { dayOfWeek: true, timeBlocks: true } } },
  });

  for (const emp of allEmployees) {
    for (const day of emp.weeklySchedule) {
      if (overriddenKeys.has(`${emp.id}-${day.dayOfWeek}`)) continue;
      const blocks = (day.timeBlocks as unknown as TimeBlock[]) ?? DEFAULT_TIME_BLOCKS;
      for (const block of blocks) {
        scheduledMinutes += timeToMinutes(block.end) - timeToMinutes(block.start);
      }
    }
  }

  // Add minutes from override days
  for (const override of workDayOverrides) {
    if (!override.isWorking) continue;
    const blocks = (override.timeBlocks as unknown as TimeBlock[]) ?? DEFAULT_TIME_BLOCKS;
    for (const block of blocks) {
      scheduledMinutes += timeToMinutes(block.end) - timeToMinutes(block.start);
    }
  }

  // Query 3: booked minutes this week
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { service: { select: { durationMinutes: true } } },
  });

  const bookedMinutes = bookedAppointments.reduce(
    (sum, apt) => sum + (apt.service?.durationMinutes ?? 0),
    0
  );

  return {
    count: calculateWeekSlotsCount(scheduledMinutes, bookedMinutes),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Add controller handler**

In `cosmo-app/apps/server/src/modules/employees/employees.controller.ts`, add:

```typescript
export const getWeekSlotsCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await employeesService.getWeekSlotsCount();
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 6: Register route BEFORE `/:id` routes**

In `cosmo-app/apps/server/src/modules/employees/employees.router.ts`, add to the Public section before any `/:id` routes:

```typescript
router.get('/week-slots-count', ctrl.getWeekSlotsCount);
```

The line must appear before `router.patch('/:id', ...)` and `router.delete('/:id', ...)`.

- [ ] **Step 7: Build backend**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/employees/
git commit -m "feat: add GET /employees/week-slots-count endpoint"
```

---

## Task 4: Backend — `GET /api/appointments/follow-up-reminders`

**Files:**
- Modify: `cosmo-app/apps/server/src/modules/appointments/appointments.service.ts`
- Modify: `cosmo-app/apps/server/src/modules/appointments/appointments.controller.ts`
- Modify: `cosmo-app/apps/server/src/modules/appointments/appointments.router.ts`
- Create: `cosmo-app/apps/server/src/modules/appointments/appointments.followup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `cosmo-app/apps/server/src/modules/appointments/appointments.followup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeFollowUpReminders } from './appointments.service';

// We extract and test the pure calculation logic.
// computeFollowUpReminders takes a list of completed appointments and today's date,
// returns reminders where today >= triggerDate.

interface CompletedApt {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
}

describe('computeFollowUpReminders', () => {
  const today = new Date('2026-04-07');

  it('returns reminder when past trigger date (85% of interval)', () => {
    // interval = 20 days, trigger at day 17 (floor(20*0.85))
    // lastVisit = 2026-03-21 → triggerDate = 2026-04-07 → today = trigger → included
    const apt: CompletedApt = {
      serviceId: 'svc1',
      serviceName: 'Manicure',
      serviceSlug: 'manicure',
      lastVisitDate: new Date('2026-03-21'),
      recommendedIntervalDays: 20,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results).toHaveLength(1);
    expect(results[0].serviceId).toBe('svc1');
  });

  it('does not return reminder when before trigger date', () => {
    // interval = 21 days, trigger at day 17 (floor(21*0.85) = 17)
    // lastVisit = 2026-03-25 → triggerDate = 2026-04-11 → today < trigger → not included
    const apt: CompletedApt = {
      serviceId: 'svc2',
      serviceName: 'Pedicure',
      serviceSlug: 'pedicure',
      lastVisitDate: new Date('2026-03-25'),
      recommendedIntervalDays: 21,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results).toHaveLength(0);
  });

  it('daysOverdue is negative when before recommended return date but past trigger', () => {
    // interval = 20, trigger at 17, recommendedReturnDate at 20
    // lastVisit = 2026-03-21, today = 2026-04-07 (17 days after) → daysOverdue = 17 - 20 = -3
    const apt: CompletedApt = {
      serviceId: 'svc3',
      serviceName: 'Zabieg',
      serviceSlug: 'zabieg',
      lastVisitDate: new Date('2026-03-21'),
      recommendedIntervalDays: 20,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results[0].daysOverdue).toBe(-3);
  });

  it('daysOverdue is positive when overdue', () => {
    // interval = 21, trigger at 17
    // lastVisit = 2026-03-01 → 37 days ago → daysOverdue = 37 - 21 = 16
    const apt: CompletedApt = {
      serviceId: 'svc4',
      serviceName: 'Laminowanie',
      serviceSlug: 'laminowanie',
      lastVisitDate: new Date('2026-03-01'),
      recommendedIntervalDays: 21,
    };
    const results = computeFollowUpReminders([apt], today);
    expect(results[0].daysOverdue).toBe(16);
  });

  it('sorts by daysOverdue descending (most overdue first)', () => {
    const apts: CompletedApt[] = [
      { serviceId: 'a', serviceName: 'A', serviceSlug: 'a', lastVisitDate: new Date('2026-03-10'), recommendedIntervalDays: 21 },
      { serviceId: 'b', serviceName: 'B', serviceSlug: 'b', lastVisitDate: new Date('2026-03-01'), recommendedIntervalDays: 21 },
    ];
    const results = computeFollowUpReminders(apts, today);
    expect(results[0].daysOverdue).toBeGreaterThanOrEqual(results[1].daysOverdue);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/appointments/appointments.followup.test.ts
```

Expected: FAIL — `computeFollowUpReminders` not exported.

- [ ] **Step 3: Implement `computeFollowUpReminders` and `getFollowUpReminders`**

Add to `cosmo-app/apps/server/src/modules/appointments/appointments.service.ts`.

First, add `addDays` and `differenceInCalendarDays` to the imports from `date-fns` at the top of the file (the codebase already uses `date-fns` in `treatment-series.service.ts`):

```typescript
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
```

Then add the interfaces and functions:

```typescript
export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}

interface CompletedAptForReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
}

// Pure calculation — exported for unit testing.
// Uses date-fns for DST-safe calendar-day arithmetic.
export function computeFollowUpReminders(
  apts: CompletedAptForReminder[],
  today: Date
): FollowUpReminder[] {
  const todayDay = startOfDay(today);

  return apts
    .map((apt) => {
      const lastVisit = startOfDay(apt.lastVisitDate);
      const triggerDays = Math.floor(apt.recommendedIntervalDays * 0.85);
      const triggerDate = addDays(lastVisit, triggerDays);
      const recommendedReturnDate = addDays(lastVisit, apt.recommendedIntervalDays);

      if (todayDay < triggerDate) return null;

      const daysOverdue = differenceInCalendarDays(todayDay, recommendedReturnDate);

      return {
        serviceId: apt.serviceId,
        serviceName: apt.serviceName,
        serviceSlug: apt.serviceSlug,
        lastVisitDate: apt.lastVisitDate.toISOString(),
        recommendedReturnDate: recommendedReturnDate.toISOString(),
        daysOverdue,
      } satisfies FollowUpReminder;
    })
    .filter((r): r is FollowUpReminder => r !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const getFollowUpReminders = async (userId: string): Promise<FollowUpReminder[]> => {
  // Fetch most recent COMPLETED appointment per service for this user
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      service: { recommendedIntervalDays: { not: null } },
    },
    include: {
      service: {
        select: { id: true, name: true, slug: true, recommendedIntervalDays: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Keep only the most recent appointment per serviceId
  const latestByService = new Map<string, typeof appointments[number]>();
  for (const apt of appointments) {
    if (!latestByService.has(apt.serviceId)) {
      latestByService.set(apt.serviceId, apt);
    }
  }

  const input: CompletedAptForReminder[] = [...latestByService.values()].map((apt) => ({
    serviceId: apt.service.id,
    serviceName: apt.service.name,
    serviceSlug: apt.service.slug,
    lastVisitDate: new Date(apt.date),
    recommendedIntervalDays: apt.service.recommendedIntervalDays!,
  }));

  return computeFollowUpReminders(input, new Date());
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/appointments/appointments.followup.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Add controller handler**

In `cosmo-app/apps/server/src/modules/appointments/appointments.controller.ts`, add:

```typescript
export const getFollowUpReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await appointmentsService.getFollowUpReminders(req.user!.id);
    res.json({ status: 'success', data: { reminders } });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 6: Register route BEFORE `/:id` routes**

In `cosmo-app/apps/server/src/modules/appointments/appointments.router.ts`, add after `router.get('/me', ...)`:

```typescript
router.get('/follow-up-reminders', appointmentsController.getFollowUpReminders);
```

This must appear before `router.post('/:id/photo', ...)` and all other `/:id` routes.

- [ ] **Step 7: Build backend**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/appointments/
git commit -m "feat: add GET /appointments/follow-up-reminders endpoint"
```

---

## Task 5: Frontend API clients

**Files:**
- Modify: `cosmo-app/apps/web/src/api/employees.api.ts`
- Modify: `cosmo-app/apps/web/src/api/appointments.api.ts`

- [ ] **Step 1: Add `getWeekSlotsCount` to employees API**

In `cosmo-app/apps/web/src/api/employees.api.ts`, add to the `employeesApi` object in the `// ── Public` section:

```typescript
getWeekSlotsCount: async (): Promise<{ count: number; weekStart: string; weekEnd: string }> => {
  const res = await api.get('/employees/week-slots-count');
  return res.data.data;
},
```

- [ ] **Step 2: Add `getFollowUpReminders` to appointments API**

Open `cosmo-app/apps/web/src/api/appointments.api.ts`. Add the `FollowUpReminder` interface **at the top of the file, before the `appointmentsApi` object** (named exports defined after the object are not reachable by the widget import):

```typescript
export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}
```

Then add to the `appointmentsApi` object:

```typescript
getFollowUpReminders: async (): Promise<FollowUpReminder[]> => {
  const res = await api.get('/appointments/follow-up-reminders');
  return res.data.data.reminders;
},
```

- [ ] **Step 3: Build frontend to check for TS errors**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/api/employees.api.ts apps/web/src/api/appointments.api.ts
git commit -m "feat: add getWeekSlotsCount and getFollowUpReminders API clients"
```

---

## Task 6: Frontend — Seasonal recommendations on homepage

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/public/Home.tsx`

- [ ] **Step 1: Add season detection helper at top of Home.tsx**

After the existing imports, add:

```typescript
import { Season } from '@cosmo/shared';
import { servicesApi } from '@/api/services.api';

function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return Season.SPRING;
  if (month >= 5 && month <= 7) return Season.SUMMER;
  if (month >= 8 && month <= 10) return Season.AUTUMN;
  return Season.WINTER;
}

const SEASON_LABELS: Record<Season, string> = {
  [Season.SPRING]: 'Wiosna',
  [Season.SUMMER]: 'Lato',
  [Season.AUTUMN]: 'Jesień',
  [Season.WINTER]: 'Zima',
};
```

- [ ] **Step 2: Add query for all services inside the `Home` component**

`servicesApi.getAll` already returns `Promise<Service[]>` (typed in `services.api.ts`). After Task 1 adds `seasons: Season[]` to the `Service` interface, the query is fully typed.

Add the import at the top of `Home.tsx`:
```typescript
import type { Service } from '@cosmo/shared';
```

Inside `export const Home = () => {`, add:

```typescript
const { data: allServices = [] } = useQuery<Service[]>({
  queryKey: ['services'],
  queryFn: servicesApi.getAll,
  staleTime: 10 * 60_000,
  enabled: isAuthenticated,
});

const currentSeason = getCurrentSeason();
const seasonalServices = allServices
  .filter((s) => s.isActive && s.seasons.includes(currentSeason))
  .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  .slice(0, 3);
```

- [ ] **Step 3: Add seasonal recommendations section between Bento grid and Testimonials**

Find the comment `{/* ── TESTIMONIALS (editorial) ── */}` in `Home.tsx` and insert the new section directly before it:

```tsx
{/* ── SEASONAL RECOMMENDATIONS (logged-in only) ── */}
{isAuthenticated && seasonalServices.length > 0 && (
  <section className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
    <div className="container max-w-6xl mx-auto px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: '#B8913A' }}>
          Dla Ciebie teraz
        </p>
        <h2 className="font-heading text-3xl font-bold" style={{ color: '#1A1208' }}>
          {SEASON_LABELS[currentSeason]} — polecane zabiegi
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {seasonalServices.map((s) => (
          <div
            key={s.id}
            className="bg-white p-6 shadow-sm flex flex-col justify-between"
            style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
          >
            <div>
              <h3 className="font-heading font-bold text-lg mb-2" style={{ color: '#1A1208' }}>{s.name}</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.6)' }}>{s.description}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="font-bold" style={{ color: '#B8913A' }}>od {Number(s.price).toFixed(0)} zł</p>
              <Link to={`/rezerwacja?serviceId=${s.id}`}>
                <Button size="sm" className="rounded-full text-xs font-semibold" style={{ backgroundColor: '#1A1208', color: '#fff' }}>
                  Zarezerwuj →
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 4: Build frontend**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/Home.tsx
git commit -m "feat: add seasonal service recommendations section to homepage"
```

---

## Task 7: Frontend — Slots counter in hero

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/public/Home.tsx`

- [ ] **Step 1: Add week slots query inside `Home` component**

Add alongside the existing `nextSlot` query:

```typescript
const { data: weekSlots } = useQuery({
  queryKey: ['week-slots-count'],
  queryFn: employeesApi.getWeekSlotsCount,
  staleTime: 5 * 60_000,
});
```

- [ ] **Step 2: Add urgency copy helper**

Add near the top of the component (after queries):

```typescript
function getSlotsUrgency(count: number | undefined): { text: string; color: string } | null {
  if (count === undefined || count === 0) return null;
  if (count <= 2) return { text: `🔴 Ostatnie ${count} miejsce w tym tygodniu!`, color: '#DC2626' };
  if (count <= 5) return { text: `⚡ Zostało tylko ${count} wolnych terminów!`, color: '#B8913A' };
  return { text: `Wolnych terminów w tym tygodniu: ${count}`, color: 'rgba(26,18,8,0.5)' };
}
```

- [ ] **Step 3: Render urgency copy inside the "Najbliższy termin" card**

In `Home.tsx`, find the card that renders `formattedSlot?.time` (the `{formattedSlot?.time}` line). Directly after the time `<p>`, and before the `<Link>` for the button, add:

```tsx
{(() => {
  const urgency = getSlotsUrgency(weekSlots?.count);
  return urgency ? (
    <p className="text-xs font-semibold mt-1" style={{ color: urgency.color }}>
      {urgency.text}
    </p>
  ) : null;
})()}
```

- [ ] **Step 4: Build frontend**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/public/Home.tsx
git commit -m "feat: add weekly slots urgency counter to homepage hero"
```

---

## Task 8: Frontend — FollowUpReminderWidget component

**Files:**
- Create: `cosmo-app/apps/web/src/components/appointments/FollowUpReminderWidget.tsx`
- Modify: `cosmo-app/apps/web/src/pages/user/Appointments.tsx`

- [ ] **Step 1: Create FollowUpReminderWidget.tsx**

Create `cosmo-app/apps/web/src/components/appointments/FollowUpReminderWidget.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appointmentsApi, type FollowUpReminder } from '@/api/appointments.api';

const DISMISS_PREFIX = 'cosmo-reminder-dismissed-';

function isDismissed(serviceId: string): boolean {
  return !!sessionStorage.getItem(`${DISMISS_PREFIX}${serviceId}`);
}

function dismiss(serviceId: string): void {
  sessionStorage.setItem(`${DISMISS_PREFIX}${serviceId}`, '1');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

export const FollowUpReminderWidget = () => {
  const [dismissed, setDismissed] = useState<Set<string>>(
    () => new Set() // populated lazily on render
  );

  const { data: reminders = [] } = useQuery({
    queryKey: ['follow-up-reminders'],
    queryFn: appointmentsApi.getFollowUpReminders,
    staleTime: 10 * 60_000,
  });

  const visible = reminders
    .filter((r) => !isDismissed(r.serviceId) && !dismissed.has(r.serviceId))
    .slice(0, 3);

  if (visible.length === 0) return null;

  const handleDismiss = (serviceId: string) => {
    dismiss(serviceId);
    setDismissed((prev) => new Set([...prev, serviceId]));
  };

  return (
    <div className="space-y-3 mb-6">
      {visible.map((r: FollowUpReminder) => (
        <div
          key={r.serviceId}
          className="flex items-start justify-between gap-4 p-4 rounded-2xl border"
          style={{ backgroundColor: '#FFFBF5', borderColor: 'rgba(184,145,58,0.3)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: '#1A1208' }}>
              Czas na odnowienie — {r.serviceName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(26,18,8,0.55)' }}>
              {r.daysOverdue > 0
                ? `${r.daysOverdue} dni po zalecanym terminie (${formatDate(r.recommendedReturnDate)})`
                : `Zalecany termin: ${formatDate(r.recommendedReturnDate)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={`/rezerwacja?serviceId=${r.serviceId}`}>
              <Button
                size="sm"
                className="rounded-full text-xs font-semibold"
                style={{ backgroundColor: '#1A1208', color: '#fff' }}
              >
                Zarezerwuj →
              </Button>
            </Link>
            <button
              onClick={() => handleDismiss(r.serviceId)}
              className="p-1 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Zamknij"
            >
              <X size={14} style={{ color: 'rgba(26,18,8,0.4)' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Render widget at top of Appointments.tsx**

Read `cosmo-app/apps/web/src/pages/user/Appointments.tsx` to find the top of the JSX return. Import and render the widget:

```typescript
import { FollowUpReminderWidget } from '@/components/appointments/FollowUpReminderWidget';
```

At the very top of the page's main content (before the appointments list), add:

```tsx
<FollowUpReminderWidget />
```

- [ ] **Step 3: Build frontend**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/appointments/FollowUpReminderWidget.tsx apps/web/src/pages/user/Appointments.tsx
git commit -m "feat: add follow-up reminder widget to user appointments page"
```

---

## Task 9: Admin UI — seasons checkboxes in AdminServiceDetail

**Files:**
- Modify: `cosmo-app/apps/web/src/pages/admin/AdminServiceDetail.tsx`

- [ ] **Step 1: Add seasons state and import**

In `cosmo-app/apps/web/src/pages/admin/AdminServiceDetail.tsx`, add the import and state:

```typescript
import { Season } from '@cosmo/shared';

// inside component, with other useState declarations:
const [seasons, setSeasons] = useState<Season[]>([]);
```

- [ ] **Step 2: Hydrate from service data**

In the existing `useEffect` that hydrates form state from `service`, add:

```typescript
setSeasons((service?.seasons as Season[]) ?? []);
```

- [ ] **Step 3: Include seasons in the save mutation**

The `saveMutation` already builds a JSON payload. Update it to include `seasons`:

Find the line:
```typescript
JSON.stringify({ detailedContent: content, routineFirst48h, routineFollowingDays, routineProducts }),
```

Change to:
```typescript
JSON.stringify({ detailedContent: content, routineFirst48h, routineFollowingDays, routineProducts, seasons }),
```

- [ ] **Step 4: Add checkboxes to the UI**

Find the last `<div className="space-y-3">` block before the Save button and add a new section after the routine fields:

```tsx
<div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
  <div>
    <h2 className="text-base font-semibold">Sezonowość</h2>
    <p className="text-xs text-muted-foreground mt-0.5">
      Zaznacz pory roku, w których ta usługa pojawi się w sekcji rekomendacji na stronie głównej.
    </p>
  </div>
  <div className="flex flex-wrap gap-4">
    {([
      { value: Season.SPRING, label: 'Wiosna' },
      { value: Season.SUMMER, label: 'Lato' },
      { value: Season.AUTUMN, label: 'Jesień' },
      { value: Season.WINTER, label: 'Zima' },
    ] as const).map(({ value, label }) => (
      <label key={value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={seasons.includes(value)}
          onChange={(e) =>
            setSeasons((prev) =>
              e.target.checked ? [...prev, value] : prev.filter((s) => s !== value)
            )
          }
          className="w-4 h-4 rounded"
          style={{ accentColor: '#B8913A' }}
        />
        <span className="text-sm font-medium">{label}</span>
      </label>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Build frontend**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/admin/AdminServiceDetail.tsx
git commit -m "feat: add seasons checkboxes to admin service detail page"
```

---

## Task 10: Smoke test end-to-end

- [ ] **Step 1: Start the dev stack**

```bash
cd cosmo-app && pnpm dev
```

Expected: frontend on :5173, backend on :3001, no startup errors.

- [ ] **Step 2: Verify week-slots-count endpoint**

```bash
curl http://localhost:3001/api/employees/week-slots-count
```

Expected: `{"status":"success","data":{"count":<number>,"weekStart":"...","weekEnd":"..."}}`

- [ ] **Step 3: Verify follow-up-reminders endpoint (requires auth token)**

Log in as a user who has completed appointments. Copy the access token from sessionStorage in browser DevTools, then:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/appointments/follow-up-reminders
```

Expected: `{"status":"success","data":{"reminders":[...]}}`

- [ ] **Step 4: Verify seasons field is returned in services API**

```bash
curl http://localhost:3001/api/services | jq '.data.services[0].seasons'
```

Expected: `[]` (empty array for existing services).

- [ ] **Step 5: Set seasons on a service via admin UI**

Log in as admin, go to `/admin/uslugi/<slug>`, check "Wiosna" checkbox, save. Then verify:

```bash
curl http://localhost:3001/api/services | jq '.[] | select(.seasons | length > 0)'
```

Expected: the updated service has `"seasons": ["SPRING"]`.

- [ ] **Step 6: Verify seasonal section appears on homepage**

Log in as a regular user. Navigate to `/`. The "Wiosna — polecane zabiegi" section should appear between the bento grid and testimonials (if current month is March–May).

- [ ] **Step 7: Verify follow-up widget appears in user panel**

Navigate to `/user/wizyty`. If the user has a completed appointment with a service that has `recommendedIntervalDays` set, and 85% of the interval has passed, the yellow reminder card should appear at the top.

- [ ] **Step 8: Run all backend tests**

```bash
cd cosmo-app/apps/server && pnpm test
```

Expected: all tests pass.
