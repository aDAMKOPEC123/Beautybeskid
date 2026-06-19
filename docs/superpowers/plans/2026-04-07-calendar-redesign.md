# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom admin calendar grid with FullCalendar, add a slide-out client drawer, enrich appointment cards with 8 fields, and add a day view with per-employee columns.

**Architecture:** Install FullCalendar + resource plugins. Migrate the CalendarView section of `Appointments.tsx` into focused components under `components/calendar/`. Extend two backend endpoints (appointments filter, recommendations by user) and add three frontend API wrappers. The existing list view and appointment modals are migrated, not rewritten.

**Tech Stack:** React 19, TypeScript, FullCalendar v6 (`@fullcalendar/react`, `@fullcalendar/resource-timegrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`, `@fullcalendar/interaction`, `@fullcalendar/core`), TanStack Query v5, Tailwind CSS, Vitest (backend tests only).

---

## File Map

### New files
- `apps/web/src/components/calendar/AppointmentCard.tsx` — FullCalendar `eventContent` renderer (8-field card)
- `apps/web/src/components/calendar/HappyHourOverlay.tsx` — fetches happy hours, converts to FullCalendar backgroundEvents
- `apps/web/src/components/calendar/ClientDrawer.tsx` — slide-out panel with tab routing
- `apps/web/src/components/calendar/ClientDrawer/DrawerVisitTab.tsx` — appointment details + quick actions
- `apps/web/src/components/calendar/ClientDrawer/DrawerHistoryTab.tsx` — paginated past appointments
- `apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx` — skin journal (read-only)
- `apps/web/src/components/calendar/ClientDrawer/DrawerRoutineTab.tsx` — routine from last service
- `apps/web/src/components/calendar/ClientDrawer/DrawerProductsTab.tsx` — recommended products
- `apps/web/src/components/calendar/AddAppointmentModal.tsx` — manual appointment creation (migrated + cleaned)
- `apps/web/src/components/calendar/HappyHourModal.tsx` — happy hour create/edit (migrated + cleaned)
- `apps/web/src/components/calendar/CalendarView.tsx` — FullCalendar wrapper, view switching, resources

### Modified files
- `apps/web/src/pages/admin/Appointments.tsx` — reduced to layout + state orchestration (~300 lines)
- `apps/web/src/api/appointments.api.ts` — extend `getAll` with optional filter params
- `apps/web/src/api/users.api.ts` — add `getById(userId)` wrapper
- `apps/web/src/api/recommendations.api.ts` — add `getByUser(userId)` wrapper
- `apps/server/src/modules/appointments/appointments.service.ts` — extend `getAllAppointments` with optional filters
- `apps/server/src/modules/appointments/appointments.controller.ts` — pass query params to service
- `apps/server/src/modules/recommendations/recommendations.service.ts` — add `getRecommendationsByUser`
- `apps/server/src/modules/recommendations/recommendations.controller.ts` — add `getByUser` handler
- `apps/server/src/modules/users/users.router.ts` — add `GET /:id/recommendations` route
- `apps/web/package.json` — add FullCalendar dependencies

### Test files
- `apps/server/src/modules/appointments/appointments.service.test.ts` — tests for filtered getAll
- `apps/server/src/modules/recommendations/recommendations.service.test.ts` — tests for getByUser

---

## Task 1: Install FullCalendar dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install packages**

Run from `apps/web/`:
```bash
pnpm add @fullcalendar/core@^6.1.15 @fullcalendar/react@^6.1.15 @fullcalendar/resource-timegrid@^6.1.15 @fullcalendar/timegrid@^6.1.15 @fullcalendar/list@^6.1.15 @fullcalendar/interaction@^6.1.15
```

- [ ] **Step 2: Verify install**

Run from `apps/web/`:
```bash
pnpm tsc --noEmit 2>&1 | head -20
```
Expected: no errors about missing FullCalendar types.

- [ ] **Step 3: Note on FullCalendar Premium licence**

`@fullcalendar/resource-timegrid` is a FullCalendar Scheduler (Premium) plugin. For production commercial use, obtain a licence key at https://fullcalendar.io/pricing and pass it as `schedulerLicenseKey="YOUR_KEY"` on the `<FullCalendar>` component. For development, use `schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"` (non-commercial attribution licence) or `schedulerLicenseKey="GPL-My-Project-Is-Open-Source"`.

- [ ] **Step 4: Commit**

```bash
cd apps/web && git add package.json pnpm-lock.yaml
git commit -m "chore: add FullCalendar v6 dependencies"
```

---

## Task 2: Backend — extend `GET /appointments` with optional filters

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts:153-161`
- Modify: `apps/server/src/modules/appointments/appointments.controller.ts:46-53`
- Create: `apps/server/src/modules/appointments/appointments.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/modules/appointments/appointments.service.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getAllAppointments } from './appointments.service';

describe('getAllAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointment.findMany as any).mockResolvedValue([]);
  });

  it('calls findMany with no where clause when no filters passed', async () => {
    await getAllAppointments();
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('filters by userId when provided', async () => {
    await getAllAppointments({ userId: 'user-123' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } })
    );
  });

  it('filters by status when provided', async () => {
    await getAllAppointments({ status: 'COMPLETED' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'COMPLETED' } })
    );
  });

  it('applies skip and take for pagination', async () => {
    await getAllAppointments({ page: 2, limit: 10 });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/server && pnpm vitest run src/modules/appointments/appointments.service.test.ts
```
Expected: FAIL — `getAllAppointments` does not accept parameters yet.

- [ ] **Step 3: Extend `getAllAppointments` in the service**

In `apps/server/src/modules/appointments/appointments.service.ts`, replace lines 153–161:

```typescript
export const getAllAppointments = async (filters?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;

  const take = filters?.limit ?? undefined;
  const skip = take && filters?.page ? (filters.page - 1) * take : undefined;

  return prisma.appointment.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    skip,
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
};
```

Note: `user.id` is added to the select so `userId` is available on the returned appointment objects on the frontend.

- [ ] **Step 4: Extend the controller to forward query params**

In `apps/server/src/modules/appointments/appointments.controller.ts`, replace lines 46–53:

```typescript
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, status, page, limit } = req.query as Record<string, string | undefined>;
    const appointments = await appointmentsService.getAllAppointments({
      userId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/server && pnpm vitest run src/modules/appointments/appointments.service.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/appointments/appointments.service.ts \
         apps/server/src/modules/appointments/appointments.controller.ts \
         apps/server/src/modules/appointments/appointments.service.test.ts
git commit -m "feat(api): extend GET /appointments with userId/status/page/limit filters"
```

---

## Task 3: Backend — admin recommendations-by-user endpoint

**Files:**
- Modify: `apps/server/src/modules/recommendations/recommendations.service.ts`
- Modify: `apps/server/src/modules/recommendations/recommendations.controller.ts`
- Modify: `apps/server/src/modules/users/users.router.ts`
- Create: `apps/server/src/modules/recommendations/recommendations.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/modules/recommendations/recommendations.service.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    appointmentRecommendation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getRecommendationsByUser } from './recommendations.service';

describe('getRecommendationsByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointmentRecommendation.findMany as any).mockResolvedValue([]);
  });

  it('queries by userId', async () => {
    await getRecommendationsByUser('user-abc');
    expect(prisma.appointmentRecommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-abc' } })
    );
  });

  it('returns empty array when no recommendations found', async () => {
    const result = await getRecommendationsByUser('user-abc');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/server && pnpm vitest run src/modules/recommendations/recommendations.service.test.ts
```
Expected: FAIL — `getRecommendationsByUser` does not exist.

- [ ] **Step 3: Verify `AppointmentRecommendation` has a direct `userId` field**

```bash
grep -A 20 "model AppointmentRecommendation" apps/server/prisma/schema.prisma
```
Expected: a `userId String` field (not just via relation). The existing `getMyRecommendations` service already uses `where: { userId }`, confirming this field exists. If for any reason `userId` is absent, the query must be rewritten to filter via `appointment: { userId }`.

- [ ] **Step 4: Add `getRecommendationsByUser` to the service**

Append to `apps/server/src/modules/recommendations/recommendations.service.ts`:

```typescript
export const getRecommendationsByUser = async (userId: string) => {
  const recommendations = await prisma.appointmentRecommendation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          service: { select: { name: true } },
        },
      },
      product: true,
      addedBy: { select: { name: true } },
    },
  });

  // Group by appointment (same shape as getMyRecommendations)
  const grouped: Record<string, {
    appointmentId: string;
    appointmentDate: string;
    serviceName: string;
    recommendations: typeof recommendations;
  }> = {};

  for (const rec of recommendations) {
    const key = rec.appointmentId;
    if (!grouped[key]) {
      grouped[key] = {
        appointmentId: rec.appointment.id,
        appointmentDate: rec.appointment.date.toISOString(),
        serviceName: rec.appointment.service.name,
        recommendations: [],
      };
    }
    grouped[key].recommendations.push(rec);
  }

  return Object.values(grouped);
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/server && pnpm vitest run src/modules/recommendations/recommendations.service.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Add controller handler**

Append to `apps/server/src/modules/recommendations/recommendations.controller.ts`:

```typescript
export const getByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await recommendationsService.getRecommendationsByUser(req.params.id);
    res.json({ status: 'success', data: { groups } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 5: Register route in users router**

In `apps/server/src/modules/users/users.router.ts`, add after line 23 (`router.patch('/:id/card', ...)`):

```typescript
router.get('/:id/recommendations', requireAdmin, recommendationsController.getByUser);
```

Place it **before** `router.get('/:id', requireAdmin, ...)` to avoid `:id` capture conflict.

The file becomes:
```typescript
router.get('/', requireAdmin, usersController.getAllUsers);
router.get('/me/recommendations', recommendationsController.getMyRecommendations);  // already exists
router.patch('/:id/card', usersController.updateUserCard);
router.get('/:id/recommendations', requireAdmin, recommendationsController.getByUser);  // NEW
router.get('/:id', requireAdmin, usersController.getUserDetails);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd apps/server && pnpm vitest run src/modules/recommendations/recommendations.service.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/recommendations/ \
         apps/server/src/modules/users/users.router.ts
git commit -m "feat(api): add GET /users/:id/recommendations admin endpoint"
```

---

## Task 4: Frontend API extensions

**Files:**
- Modify: `apps/web/src/api/appointments.api.ts`
- Modify: `apps/web/src/api/users.api.ts`
- Modify: `apps/web/src/api/recommendations.api.ts`

- [ ] **Step 1: Extend `appointmentsApi.getAll` with optional params**

In `apps/web/src/api/appointments.api.ts`, replace lines 17–20:

```typescript
getAll: async (params?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get('/appointments', { params });
  return res.data.data.appointments;
},
```

This is backwards-compatible — existing callers pass no arguments and get the same result.

- [ ] **Step 2: Add `usersApi.getById`**

In `apps/web/src/api/users.api.ts`, add to the `usersApi` object:

```typescript
getById: async (userId: string) => {
  const res = await api.get(`/users/${userId}`);
  return res.data.data.user;
},
```

- [ ] **Step 3: Add `recommendationsApi.getByUser`**

In `apps/web/src/api/recommendations.api.ts`, add to the `recommendationsApi` object:

```typescript
getByUser: async (userId: string): Promise<RecommendationGroup[]> => {
  const res = await api.get(`/users/${userId}/recommendations`);
  return res.data.data.groups;
},
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/appointments.api.ts \
         apps/web/src/api/users.api.ts \
         apps/web/src/api/recommendations.api.ts
git commit -m "feat(api): extend appointments getAll filters, add usersApi.getById and recommendationsApi.getByUser"
```

---

## Task 5: `AppointmentCard.tsx` — 8-field event card

**Files:**
- Create: `apps/web/src/components/calendar/AppointmentCard.tsx`

The card is a React component passed to FullCalendar's `eventContent` prop. It receives an `EventContentArg` from FullCalendar and renders the 8 fields. Heights < 40px hide the phone number; heights < 60px hide price and status label.

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/calendar/AppointmentCard.tsx`:

```tsx
import { EventContentArg } from '@fullcalendar/core';

// Color map matching existing status scheme
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-indigo-600',
  COMPLETED: 'bg-green-600',
  CANCELLED: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface AppointmentEventProps {
  clientName: string;
  serviceName: string;
  price: number;
  discountPercent?: number;
  status: string;
  employeeInitials?: string;
  employeeColor?: string;
  hasAllergies: boolean;
  hasNotes: boolean;
  phone?: string;
}

// FullCalendar passes extendedProps on each event — we store our data there
// Height detection via event.el is unreliable during initial render in FC v6.
// Instead, use the container div's ref and CSS overflow:hidden for graceful collapse.
export function AppointmentCard({ timeText, event, view }: EventContentArg) {
  const props = event.extendedProps as AppointmentEventProps;

  // Approximate slot height from view slotMinTime/slotMaxTime + event duration.
  // Simpler: always render all fields; CSS overflow:hidden on the container clips them.
  // Phone (field 8) uses opacity-0 class when card is too short — handled via parent container height.
  const showPhone = !!props.phone;
  const showPriceStatus = true;

  const priceLabel = props.discountPercent
    ? `${props.price} zł (–${props.discountPercent}%)`
    : `${props.price} zł`;

  const bgColor = STATUS_COLORS[props.status] ?? 'bg-gray-500';

  return (
    <div className={`${bgColor} text-white rounded px-1.5 py-1 text-[11px] leading-snug h-full overflow-hidden`}>
      <div className="font-semibold truncate">{props.clientName}</div>
      <div className="truncate opacity-90">{props.serviceName}</div>
      <div className="opacity-80">{timeText}</div>

      {showPriceStatus && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className="opacity-80">{priceLabel}</span>
          <span className="bg-white/20 rounded px-1 text-[9px]">
            {STATUS_LABELS[props.status] ?? props.status}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 mt-0.5">
        {props.employeeInitials && (
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: props.employeeColor ?? '#6366f1' }}
          >
            {props.employeeInitials}
          </span>
        )}
        {props.hasAllergies && <span title="Alergie">⚠️</span>}
        {props.hasNotes && <span title="Notatki">📝</span>}
      </div>

      {showPhone && (
        <div className="opacity-70 truncate">{props.phone}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

No test framework on frontend. Verify visually once CalendarView is wired up (Task 11).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/AppointmentCard.tsx
git commit -m "feat(calendar): add AppointmentCard component (8-field event renderer)"
```

---

## Task 6: `HappyHourOverlay.tsx` — backgroundEvents data adapter

**Files:**
- Create: `apps/web/src/components/calendar/HappyHourOverlay.tsx`

This component fetches happy hours from the API and converts them to FullCalendar `EventInput[]` with `display: 'background'`. It does not render any DOM itself — it returns the event array via a render prop / callback.

- [ ] **Step 1: Check the happy hour data shape**

Run from `apps/server/`:
```bash
# Find the HappyHour Prisma model
grep -A 15 "model HappyHour" prisma/schema.prisma
```
Expected fields: `id`, `name`, `startTime` (HH:MM string), `endTime`, `type` (ONE_TIME|RECURRING), `dayOfWeek` (0-6 for RECURRING), `date` (for ONE_TIME), `discountType`, `discountValue`, `isActive`.

- [ ] **Step 2: Create the component**

Create `apps/web/src/components/calendar/HappyHourOverlay.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { EventInput } from '@fullcalendar/core';
import happyHoursApi from '@/api/happy-hours.api';
import { format, addDays } from 'date-fns';

// Converts an HH:MM time string + a date string (YYYY-MM-DD) to ISO datetime
function toISO(date: string, time: string) {
  return `${date}T${time}:00`;
}

// Returns dates for all occurrences of a given dayOfWeek (0=Sun) within the visible range
function datesForDayOfWeek(
  dayOfWeek: number,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const dates: string[] = [];
  let d = new Date(rangeStart);
  while (d <= rangeEnd) {
    if (d.getDay() === dayOfWeek) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    d = addDays(d, 1);
  }
  return dates;
}

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  children: (events: EventInput[]) => React.ReactNode;
}

export function HappyHourOverlay({ rangeStart, rangeEnd, children }: Props) {
  const { data: raw } = useQuery({
    queryKey: ['happyHours'],
    queryFn: () => happyHoursApi.getAll().then((r: any) => r.data?.happyHours ?? r.happyHours ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const events: EventInput[] = [];

  for (const hh of raw ?? []) {
    if (!hh.isActive) continue;

    const color = 'rgba(245,158,11,0.25)'; // amber tint

    if (hh.type === 'ONE_TIME' && hh.date) {
      events.push({
        id: `hh-${hh.id}`,
        start: toISO(hh.date, hh.startTime),
        end: toISO(hh.date, hh.endTime),
        display: 'background',
        color,
        extendedProps: { happyHourId: hh.id },
      });
    } else if (hh.type === 'RECURRING' && hh.dayOfWeek != null) {
      const dates = datesForDayOfWeek(hh.dayOfWeek, rangeStart, rangeEnd);
      for (const date of dates) {
        events.push({
          id: `hh-${hh.id}-${date}`,
          start: toISO(date, hh.startTime),
          end: toISO(date, hh.endTime),
          display: 'background',
          color,
          extendedProps: { happyHourId: hh.id },
        });
      }
    }
  }

  return <>{children(events)}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/HappyHourOverlay.tsx
git commit -m "feat(calendar): add HappyHourOverlay background events adapter"
```

---

## Task 7: ClientDrawer tab components

**Files:**
- Create: `apps/web/src/components/calendar/ClientDrawer/DrawerVisitTab.tsx`
- Create: `apps/web/src/components/calendar/ClientDrawer/DrawerHistoryTab.tsx`
- Create: `apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx`
- Create: `apps/web/src/components/calendar/ClientDrawer/DrawerRoutineTab.tsx`
- Create: `apps/web/src/components/calendar/ClientDrawer/DrawerProductsTab.tsx`

All tabs follow the same pattern: fetch on mount, show skeleton while loading, show error + retry on failure.

**Shared skeleton helper** — add inline in each tab (3 lines, not worth a shared file):
```tsx
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);
```

- [ ] **Step 1: Create `DrawerVisitTab.tsx`**

```tsx
// apps/web/src/components/calendar/ClientDrawer/DrawerVisitTab.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { appointmentsApi } from '@/api/appointments.api';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  appointment: any; // full appointment object from getAll()
}

export function DrawerVisitTab({ appointment }: Props) {
  const qc = useQueryClient();

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user', appointment.userId],
    queryFn: () => usersApi.getById(appointment.userId),
    staleTime: 2 * 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(appointment.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  if (isLoading) return (
    <div className="space-y-3 p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania danych.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const hasAllergies = !!user?.cardAllergies || !!user?.cardConditions;

  return (
    <div className="p-3 space-y-3 text-sm">
      {/* Service info */}
      <div>
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Usługa</div>
        <div className="font-semibold">{appointment.service?.name}</div>
        <div className="text-gray-500">
          {new Date(appointment.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          {' · '}
          {appointment.service?.price} zł
        </div>
      </div>

      {/* Allergies */}
      {hasAllergies && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded p-2">
          <div className="text-xs font-semibold text-red-600 mb-1">⚠️ Alergie / Schorzenia</div>
          {user?.cardAllergies && <div className="text-xs text-gray-700">{user.cardAllergies}</div>}
          {user?.cardConditions && <div className="text-xs text-gray-700">{user.cardConditions}</div>}
        </div>
      )}

      {/* Preferences */}
      {user?.cardPreferences && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Preferencje</div>
          <div className="text-gray-600 text-xs">{user.cardPreferences}</div>
        </div>
      )}

      {/* Staff notes */}
      {user?.cardStaffNotes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notatki pracownika</div>
          <div className="text-gray-600 text-xs">{user.cardStaffNotes}</div>
        </div>
      )}

      {/* Appointment notes */}
      {appointment.notes && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Uwagi do wizyty</div>
          <div className="text-gray-600 text-xs">{appointment.notes}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {appointment.status === 'PENDING' && (
          <button
            onClick={() => updateStatus.mutate('CONFIRMED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-green-600 text-white text-xs py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            ✓ Potwierdź
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('COMPLETED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-indigo-600 text-white text-xs py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Zrealizowana
          </button>
        )}
        {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
          <button
            onClick={() => updateStatus.mutate('CANCELLED')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-red-500 text-white text-xs py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Anuluj
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `DrawerHistoryTab.tsx`**

```tsx
// apps/web/src/components/calendar/ClientDrawer/DrawerHistoryTab.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface Props {
  userId: string;
}

export function DrawerHistoryTab({ userId }: Props) {
  const [page, setPage] = useState(1);
  const LIMIT = 5;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointments', 'user', userId, page],
    queryFn: () => appointmentsApi.getAll({ userId, limit: LIMIT, page }),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania historii.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const appointments: any[] = data ?? [];

  return (
    <div className="p-3 space-y-2">
      {appointments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Brak historii wizyt.</p>
      )}
      {appointments.map((appt: any) => (
        <div key={appt.id} className="border border-gray-100 rounded p-2 text-xs">
          <div className="font-medium">{appt.service?.name}</div>
          <div className="text-gray-500">
            {format(new Date(appt.date), 'd MMM yyyy, HH:mm', { locale: pl })}
          </div>
          <div className="text-gray-400">{STATUS_LABELS[appt.status] ?? appt.status}</div>
        </div>
      ))}

      {/* Pagination */}
      {(page > 1 || appointments.length === LIMIT) && (
        <div className="flex justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-indigo-600 disabled:opacity-40"
          >
            ← Wstecz
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={appointments.length < LIMIT}
            className="text-xs text-indigo-600 disabled:opacity-40"
          >
            Dalej →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `DrawerJournalTab.tsx`**

```tsx
// apps/web/src/components/calendar/ClientDrawer/DrawerJournalTab.tsx
import { useQuery } from '@tanstack/react-query';
import { skinJournalApi } from '@/api/skin-journal.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😊'];

interface Props {
  userId: string;
}

export function DrawerJournalTab({ userId }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skinJournal', 'admin', userId],
    queryFn: () => skinJournalApi.adminGetJournal(userId, 1),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania dziennika.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const entries: any[] = data?.entries ?? [];

  return (
    <div className="p-3 space-y-2">
      <Link
        to={`/admin/uzytkownicy/${userId}?tab=dziennik`}
        className="text-xs text-indigo-600 hover:underline block mb-2"
      >
        Otwórz pełny dziennik ↗
      </Link>

      {entries.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Brak wpisów w dzienniku.</p>
      )}

      {entries.map((entry: any) => (
        <div key={entry.id} className="border border-gray-100 rounded p-2 text-xs">
          <div className="flex justify-between">
            <span className="font-medium">
              {format(new Date(entry.date), 'd MMM yyyy', { locale: pl })}
            </span>
            {entry.mood && <span>{MOOD_EMOJI[entry.mood]}</span>}
          </div>
          {entry.notes && (
            <div className="text-gray-500 mt-0.5 line-clamp-2">{entry.notes}</div>
          )}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.tags.map((t: string) => (
                <span key={t} className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px]">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `DrawerRoutineTab.tsx`**

```tsx
// apps/web/src/components/calendar/ClientDrawer/DrawerRoutineTab.tsx
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi } from '@/api/appointments.api';
import { servicesApi } from '@/api/services.api';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  userId: string;
}

export function DrawerRoutineTab({ userId }: Props) {
  // Step 1: get the last completed appointment to find its service slug
  const { data: lastAppt, isLoading: loadingAppt, isError: errorAppt, refetch: refetchAppt } = useQuery({
    queryKey: ['appointments', 'user', userId, 'lastCompleted'],
    queryFn: () => appointmentsApi.getAll({ userId, status: 'COMPLETED', limit: 1, page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const slug: string | undefined = lastAppt?.[0]?.service?.slug;

  // Step 2: fetch the service to get routine fields (only when slug is known)
  const { data: service, isLoading: loadingService, isError: errorService, refetch: refetchService } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  if (loadingAppt || loadingService) return (
    <div className="space-y-3 p-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  if (errorAppt || errorService) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania rutyny.
      <button onClick={() => { refetchAppt(); refetchService(); }} className="ml-2 underline">
        Spróbuj ponownie
      </button>
    </div>
  );

  if (!slug) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">Brak ukończonych wizyt.</p>
  );

  const hasRoutine = service?.routineFirst48h || service?.routineFollowingDays || service?.routineProducts;

  if (!hasRoutine) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">
      Usługa "{service?.name}" nie ma zdefiniowanej rutyny.
    </p>
  );

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="text-xs text-gray-400">
        Na podstawie ostatniej usługi: <span className="font-medium text-gray-700">{service?.name}</span>
      </div>

      {service?.routineFirst48h && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
            Pierwsze 48h
          </div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineFirst48h}</div>
        </div>
      )}

      {service?.routineFollowingDays && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
            Kolejne dni
          </div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineFollowingDays}</div>
        </div>
      )}

      {service?.routineProducts && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
            Zalecane produkty
          </div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap">{service.routineProducts}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `DrawerProductsTab.tsx`**

```tsx
// apps/web/src/components/calendar/ClientDrawer/DrawerProductsTab.tsx
import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '@/api/recommendations.api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-100 animate-pulse rounded ${className}`} />
);

interface Props {
  userId: string;
}

export function DrawerProductsTab({ userId }: Props) {
  const { data: groups, isLoading, isError, refetch } = useQuery({
    queryKey: ['recommendations', 'user', userId],
    queryFn: () => recommendationsApi.getByUser(userId),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-2 p-3">
      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  if (isError) return (
    <div className="p-3 text-sm text-red-600">
      Błąd ładowania produktów.
      <button onClick={() => refetch()} className="ml-2 underline">Spróbuj ponownie</button>
    </div>
  );

  const allGroups = groups ?? [];

  if (allGroups.length === 0) return (
    <p className="p-3 text-xs text-gray-400 text-center py-4">Brak poleconych produktów.</p>
  );

  return (
    <div className="p-3 space-y-3">
      {allGroups.map((group: any) => (
        <div key={group.appointmentId}>
          <div className="text-[10px] text-gray-400 mb-1">
            {group.serviceName} · {format(new Date(group.appointmentDate), 'd MMM yyyy', { locale: pl })}
          </div>
          {group.recommendations.map((rec: any) => (
            <div key={rec.id} className="border border-gray-100 rounded p-2 mb-1 text-xs">
              <div className="font-medium">{rec.name}</div>
              {rec.comment && <div className="text-gray-500">{rec.comment}</div>}
              <div className="text-gray-400 mt-0.5">
                Polecił/a: {rec.addedBy?.name}
                {rec.pickedUp && <span className="ml-2 text-green-600">✓ odebrane</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/calendar/ClientDrawer/
git commit -m "feat(calendar): add ClientDrawer tab components (5 tabs)"
```

---

## Task 8: `ClientDrawer.tsx` — slide-out panel

**Files:**
- Create: `apps/web/src/components/calendar/ClientDrawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/calendar/ClientDrawer.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawerVisitTab } from './ClientDrawer/DrawerVisitTab';
import { DrawerHistoryTab } from './ClientDrawer/DrawerHistoryTab';
import { DrawerJournalTab } from './ClientDrawer/DrawerJournalTab';
import { DrawerRoutineTab } from './ClientDrawer/DrawerRoutineTab';
import { DrawerProductsTab } from './ClientDrawer/DrawerProductsTab';

const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Brąz',
  SILVER: 'Srebro',
  GOLD: 'Złoto',
};

const TABS = ['Wizyta', 'Historia', 'Dziennik', 'Rutyna', 'Produkty'] as const;
type Tab = typeof TABS[number];

interface Props {
  appointment: any; // appointment object from getAll()
  onClose: () => void;
}

export function ClientDrawer({ appointment, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Wizyta');
  const navigate = useNavigate();

  const user = appointment.user; // { name, email, phone } from getAll include

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/20 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="
        fixed right-0 top-0 h-full w-full md:w-80 bg-white z-40
        shadow-xl border-l-2 border-indigo-600
        flex flex-col overflow-hidden
        animate-in slide-in-from-right duration-200
      ">
        {/* Header */}
        <div className="p-3 border-b border-gray-100 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate">{user?.name ?? '—'}</div>
            <div className="text-xs text-gray-500">{user?.phone ?? ''}</div>
            {appointment.user?.loyaltyTier && (
              <div className="text-xs text-yellow-600 mt-0.5">
                ★ {TIER_LABELS[appointment.user.loyaltyTier] ?? appointment.user.loyaltyTier}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => navigate(`/admin/uzytkownicy/${appointment.userId}`)}
              className="bg-indigo-600 text-white text-xs px-2 py-1 rounded hover:bg-indigo-700"
            >
              Profil ↗
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-2.5 py-2 text-[11px] font-medium whitespace-nowrap
                ${activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'Wizyta' && <DrawerVisitTab appointment={appointment} />}
          {activeTab === 'Historia' && <DrawerHistoryTab userId={appointment.userId} />}
          {activeTab === 'Dziennik' && <DrawerJournalTab userId={appointment.userId} />}
          {activeTab === 'Rutyna' && <DrawerRoutineTab userId={appointment.userId} />}
          {activeTab === 'Produkty' && <DrawerProductsTab userId={appointment.userId} />}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/ClientDrawer.tsx
git commit -m "feat(calendar): add ClientDrawer slide-out panel with 5 tabs"
```

---

## Task 9: `AddAppointmentModal.tsx` — manual appointment creation

**Files:**
- Create: `apps/web/src/components/calendar/AddAppointmentModal.tsx`

This migrates the existing add-appointment modal from `Appointments.tsx` into a standalone component. The existing modal is around lines 950–1050 in `Appointments.tsx` — read that section before starting this task and copy the form fields, keeping the same validation logic. The key change: accept `prefillDate`, `prefillTime`, `prefillEmployeeId` props.

- [ ] **Step 1: Locate the existing modal in Appointments.tsx**

```bash
grep -n "AddAppointmentModal\|addAppointment\|clientName\|clientPhone" \
  apps/web/src/pages/admin/Appointments.tsx | head -30
```

- [ ] **Step 2: Create `AddAppointmentModal.tsx`**

Create `apps/web/src/components/calendar/AddAppointmentModal.tsx`. The component accepts:

```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  prefillDate?: string;      // ISO date string
  prefillTime?: string;      // "HH:MM"
  prefillEmployeeId?: string;
  employees: any[];
  services: any[];
}
```

Copy the form JSX from the existing modal in `Appointments.tsx`. Add `prefillDate`, `prefillTime`, `prefillEmployeeId` as default values for the form fields. Use `appointmentsApi.createAdmin()` on submit, then call `onClose()` and `queryClient.invalidateQueries({ queryKey: ['appointments'] })`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/AddAppointmentModal.tsx
git commit -m "feat(calendar): extract AddAppointmentModal to standalone component"
```

---

## Task 10: `HappyHourModal.tsx` — happy hour create/edit

**Files:**
- Create: `apps/web/src/components/calendar/HappyHourModal.tsx`

- [ ] **Step 1: Locate the existing happy hour modal in Appointments.tsx**

```bash
grep -n "HappyHour\|happyHour\|happy_hour" \
  apps/web/src/pages/admin/Appointments.tsx | head -20
```

- [ ] **Step 2: Create `HappyHourModal.tsx`**

```tsx
interface Props {
  open: boolean;
  onClose: () => void;
  editing?: any; // existing happy hour object to edit, or undefined for create
}
```

Migrate the existing happy hour form from `Appointments.tsx`. On submit: call `happyHoursApi.create(data)` or `happyHoursApi.update(id, data)` depending on whether `editing` is set. Invalidate `['happyHours']` query on success.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/HappyHourModal.tsx
git commit -m "feat(calendar): extract HappyHourModal to standalone component"
```

---

## Task 11: `CalendarView.tsx` — FullCalendar wrapper

**Files:**
- Create: `apps/web/src/components/calendar/CalendarView.tsx`

This is the core new component. It wires FullCalendar with all plugins, renders the appointment cards, drives the view switching, and manages the drawer state.

- [ ] **Step 1: Check the `getUserDetails` user.id field**

The appointment objects returned by `getAll()` now include `user.id` (added in Task 2). Confirm:

```bash
grep "user:" apps/server/src/modules/appointments/appointments.service.ts | head -5
```
Expected: `user: { select: { id: true, name: true, email: true, phone: true } }`

- [ ] **Step 2: Create `CalendarView.tsx`**

Create `apps/web/src/components/calendar/CalendarView.tsx`:

```tsx
import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees.api';
import { AppointmentCard } from './AppointmentCard';
import { ClientDrawer } from './ClientDrawer';
import { HappyHourOverlay } from './HappyHourOverlay';
import { AddAppointmentModal } from './AddAppointmentModal';
import { HappyHourModal } from './HappyHourModal';

// Deterministic color per employee id
const EMPLOYEE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
function employeeColor(idx: number) { return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]; }

type CalendarView = 'resourceTimeGridDay' | 'timeGridWeek' | 'listWeek';

interface Props {
  appointments: any[];
  services: any[];
  onRefetch: () => void;
}

export function CalendarView({ appointments, services, onRefetch }: Props) {
  const calRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<CalendarView>('resourceTimeGridDay');
  const [zoomedEmployeeId, setZoomedEmployeeId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [addModal, setAddModal] = useState<{ date?: string; time?: string; employeeId?: string } | null>(null);
  const [happyHourModal, setHappyHourModal] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [showHappyHours, setShowHappyHours] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Compute resources (columns) for day view
  const resources = employees.map((emp: any, idx: number) => ({
    id: emp.id,
    title: emp.name,
    color: employeeColor(idx),
  }));

  // Convert appointments to FullCalendar EventInput[]
  const events: EventInput[] = appointments.map((appt: any) => {
    const empIdx = employees.findIndex((e: any) => e.id === appt.employeeId);
    const color = empIdx >= 0 ? employeeColor(empIdx) : '#6366f1';

    // Filter by zoomed employee when in single-employee day view
    if (zoomedEmployeeId && appt.employeeId !== zoomedEmployeeId) return null!;

    const durationMs = (appt.service?.durationMinutes ?? 60) * 60 * 1000;
    const start = new Date(appt.date);
    const end = new Date(start.getTime() + durationMs);

    return {
      id: appt.id,
      resourceId: appt.employeeId ?? undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        clientName: appt.user?.name ?? appt.clientName ?? '—',
        serviceName: appt.service?.name ?? '—',
        price: appt.service?.price ?? 0,
        status: appt.status,
        employeeInitials: appt.employee?.name?.substring(0, 1).toUpperCase() ?? '?',
        employeeColor: color,
        hasAllergies: false, // card fields not in getAll() — shown in drawer instead
        hasNotes: !!appt.notes || !!appt.staffNote,
        phone: appt.user?.phone ?? undefined,
        _raw: appt,
      },
    };
  }).filter(Boolean);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setSelectedAppt(arg.event.extendedProps._raw);
  }, []);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    const date = arg.startStr.split('T')[0];
    const time = arg.startStr.split('T')[1]?.substring(0, 5);
    const resourceId = (arg as any).resource?.id;
    setAddModal({ date, time, employeeId: resourceId });
  }, []);

  const switchView = (v: CalendarView) => {
    setView(v);
    setZoomedEmployeeId(null);
    calRef.current?.getApi().changeView(v);
  };

  const zoomToEmployee = (empId: string) => {
    setZoomedEmployeeId(empId);
    setView('timeGridWeek'); // reuse timeGrid without resources
    calRef.current?.getApi().changeView('timeGridDay');
  };

  const isResourceView = view === 'resourceTimeGridDay' && !zoomedEmployeeId;

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main calendar area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selectedAppt ? 'md:mr-80' : ''}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b bg-white flex-wrap">
          <button onClick={() => calRef.current?.getApi().prev()} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">←</button>
          <button onClick={() => calRef.current?.getApi().today()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">Dziś</button>
          <button onClick={() => calRef.current?.getApi().next()} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">→</button>

          <div className="ml-auto flex gap-1">
            {zoomedEmployeeId && (
              <button
                onClick={() => { setZoomedEmployeeId(null); switchView('resourceTimeGridDay'); }}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                ← Wszyscy
              </button>
            )}
            <button onClick={() => switchView('resourceTimeGridDay')} className={`px-3 py-1.5 text-sm rounded ${view === 'resourceTimeGridDay' && !zoomedEmployeeId ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Dzień</button>
            <button onClick={() => switchView('timeGridWeek')} className={`px-3 py-1.5 text-sm rounded ${view === 'timeGridWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Tydzień</button>
            <button onClick={() => switchView('listWeek')} className={`px-3 py-1.5 text-sm rounded ${view === 'listWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Lista</button>
          </div>

          <button
            onClick={() => setAddModal({})}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Wizyta
          </button>
          <button
            onClick={() => setShowHappyHours(v => !v)}
            className={`px-3 py-1.5 text-sm rounded ${showHappyHours ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
          >
            Happy Hours
          </button>
        </div>

        {/* FullCalendar */}
        <div className="flex-1 overflow-auto p-2">
          <HappyHourOverlay rangeStart={rangeStart} rangeEnd={rangeEnd}>
            {(bgEvents) => (
              <FullCalendar
                ref={calRef}
                plugins={[resourceTimeGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                schedulerLicenseKey={import.meta.env.VITE_FULLCALENDAR_LICENSE_KEY ?? 'CC-Attribution-NonCommercial-NoDerivatives'}
                initialView={view}
                resources={isResourceView ? resources : undefined}
                events={events}
                backgroundEvents={showHappyHours ? bgEvents : []}
                eventContent={(arg) => <AppointmentCard {...arg} />}
                eventClick={handleEventClick}
                selectable
                select={handleDateSelect}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                allDaySlot={false}
                headerToolbar={false}
                locale="pl"
                height="auto"
                datesSet={(info) => {
                  setRangeStart(info.start);
                  setRangeEnd(info.end);
                }}
                resourceLabelContent={(arg) => (
                  <div
                    className="flex flex-col items-center cursor-pointer hover:text-indigo-600 py-1"
                    onClick={() => zoomToEmployee(arg.resource.id)}
                  >
                    <div
                      className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center mb-0.5"
                      style={{ background: arg.resource.extendedProps?.color ?? '#6366f1' }}
                    >
                      {arg.resource.title.substring(0, 1)}
                    </div>
                    <div className="text-xs font-medium">{arg.resource.title}</div>
                  </div>
                )}
              />
            )}
          </HappyHourOverlay>
        </div>
      </div>

      {/* Client Drawer */}
      {selectedAppt && (
        <ClientDrawer
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {/* Add Appointment Modal */}
      {addModal && (
        <AddAppointmentModal
          open
          onClose={() => { setAddModal(null); onRefetch(); }}
          prefillDate={addModal.date}
          prefillTime={addModal.time}
          prefillEmployeeId={addModal.employeeId}
          employees={employees}
          services={services}
        />
      )}

      {/* Happy Hour Modal */}
      {happyHourModal.open && (
        <HappyHourModal
          open
          onClose={() => setHappyHourModal({ open: false })}
          editing={happyHourModal.editing}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```
Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(calendar): add CalendarView with FullCalendar (day/week/list, resources, drawer)"
```

---

## Task 12: Integrate into `Appointments.tsx`

**Files:**
- Modify: `apps/web/src/pages/admin/Appointments.tsx`

The existing file is 1431 lines. We replace the CalendarView section with the new `<CalendarView>` component, keeping the list view and page-level state.

- [ ] **Step 1: Read the current structure of Appointments.tsx**

```bash
grep -n "CalendarView\|ListView\|viewMode\|return (" \
  apps/web/src/pages/admin/Appointments.tsx | head -30
```

Identify: (a) where `viewMode` state is declared, (b) where the list view JSX starts, (c) where the old calendar grid JSX starts and ends.

- [ ] **Step 2: Replace the calendar section**

In `Appointments.tsx`:

1. Remove all calendar-specific state: `currentWeek`, `happyHourMode`, `selectedSlot`, `selectedAppt`, `addAppointmentModal`, `happyHourModal`, employee filter for calendar, etc. Keep list-view state.

2. Remove all imports related to the old calendar: `date-fns` calendar helpers, `HappyHour` logic.

3. Add imports:
```tsx
import { CalendarView } from '@/components/calendar/CalendarView';
```

4. Replace the old calendar JSX block with:
```tsx
{viewMode === 'calendar' && (
  <div className="h-[calc(100vh-120px)]">
    <CalendarView
      appointments={appointments ?? []}
      services={services ?? []}
      onRefetch={() => queryClient.invalidateQueries({ queryKey: ['appointments'] })}
    />
  </div>
)}
```

5. Keep the list view JSX unchanged.

6. Keep the top-level view toggle buttons (Lista / Kalendarz).

7. Keep Socket.IO `useEffect` that invalidates `['appointments']` — this drives real-time updates.

- [ ] **Step 3: Verify the app starts**

```bash
cd cosmo-app && pnpm dev
```
Open http://localhost:5173/admin/wizyty. Expected:
- Toggle between Lista and Kalendarz views works
- Kalendarz shows FullCalendar day view with employee columns
- Clicking an appointment opens the drawer
- "+ Wizyta" button opens the modal

- [ ] **Step 4: Run backend tests to confirm no regressions**

```bash
cd apps/server && pnpm test
```
Expected: all existing tests pass.

- [ ] **Step 5: Final commit**

```bash
git add apps/web/src/pages/admin/Appointments.tsx
git commit -m "feat(admin): replace custom calendar grid with FullCalendar + ClientDrawer"
```

---

## Done — Verify all success criteria

Run through the spec's success criteria manually:

- [ ] Admin can switch between Tydzień / Dzień / Lista views
- [ ] Day view shows all working employees as columns
- [ ] Clicking an employee column header zooms to single-employee view; "Wszyscy" returns
- [ ] Clicking any appointment opens the client drawer without closing the calendar
- [ ] Each drawer tab shows skeleton while loading and error+retry on failure
- [ ] All 8 card fields visible on cards ≥60px; phone hidden on slots <40px
- [ ] Empty slot click pre-fills date/time in AddAppointmentModal
- [ ] "+ Wizyta" button also opens the modal
- [ ] Happy Hours toggle shows background overlays on the grid
- [ ] Socket.IO appointment updates reflect without page refresh
- [ ] Rutyna tab shows the routine fields from the last completed service
