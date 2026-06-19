# No-Show Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `NO_SHOW` appointment status so admins can mark clients who didn't appear, and display a visible warning banner on subsequent appointments for those clients.

**Architecture:** New `NO_SHOW` value added to the Prisma `AppointmentStatus` enum (database migration required). Backend `updateStatus` service extended to handle the new terminal status. `getAllAppointments` enriches each appointment's user object with a count of their previous no-show appointments. Frontend `AppointmentRow` renders an orange warning banner when `user._count.appointments > 0`. `NO_SHOW` is treated as a terminal/archived status alongside `COMPLETED` — it appears in the archive section, not in active appointments.

**Tech Stack:** Prisma (schema + migration), Express/TypeScript (service + controller), React/TanStack Query (frontend), Tailwind CSS (banner styling), Vitest (tests)

---

## File Map

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add `NO_SHOW` to `AppointmentStatus` enum |
| `apps/server/src/modules/appointments/appointments.service.ts` | Extend `updateStatus` type + guard; add `_count` to `getAllAppointments` user select |
| `apps/server/src/modules/appointments/appointments.controller.ts` | Add `NO_SHOW` to `VALID_STATUSES` array |
| `apps/server/src/modules/appointments/appointments.service.test.ts` | Fix mock setup; add NO_SHOW filter test |
| `apps/web/src/pages/admin/Appointments.tsx` | Add NO_SHOW to config maps; fix active/archive split; add warning banner |

---

## Task 1: Add NO_SHOW to Prisma schema and migrate

**Files:**
- Modify: `apps/server/prisma/schema.prisma` — `AppointmentStatus` enum, lines ~23-28

- [ ] **Step 1: Edit schema.prisma — add NO_SHOW to enum**

Find the enum block:
```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

Change to:
```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}
```

- [ ] **Step 2: Run migration**

```bash
cd cosmo-app/apps/server && pnpm prisma:migrate
```

When prompted for migration name, enter: `add_no_show_status`

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd cosmo-app/apps/server && pnpm prisma:generate
```

Expected: `Generated Prisma Client` without errors.

---

## Task 2: Update backend service — updateStatus

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts` — `updateStatus` function (~line 492)

- [ ] **Step 1: Extend the function signature type**

Find:
```ts
export const updateStatus = async (
  id: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
) => {
```

Change to:
```ts
export const updateStatus = async (
  id: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
) => {
```

- [ ] **Step 2: Update the terminal status guard**

Find:
```ts
if (existing.status === 'COMPLETED' && status !== 'COMPLETED') {
  throw new AppError('Nie mozna cofnac zakonczonej wizyty', 400);
}
```

Change to:
```ts
const TERMINAL_STATUSES = ['COMPLETED', 'NO_SHOW'] as const;
if ((TERMINAL_STATUSES as readonly string[]).includes(existing.status) && existing.status !== status) {
  throw new AppError('Nie mozna zmienic statusu zakonczonej wizyty', 400);
}
```

`existing.status` is typed as `AppointmentStatus` by Prisma (wider than the narrower `readonly string[]`), so the cast to `readonly string[]` keeps TypeScript strict mode happy. Both `COMPLETED` and `NO_SHOW` are terminal — once either is set, the status cannot change.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: no TypeScript errors.

---

## Task 3: Update backend service — getAllAppointments no-show count

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts` — `getAllAppointments` function (~line 191)

- [ ] **Step 1: Add _count to user select in getAllAppointments**

Find the include inside `getAllAppointments`:
```ts
include: {
  ...appointmentInclude,
  user: { select: { id: true, name: true, email: true, phone: true } },
},
```

Change to:
```ts
include: {
  ...appointmentInclude,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: {
        select: {
          appointments: { where: { status: 'NO_SHOW' } },
        },
      },
    },
  },
},
```

This adds `user._count.appointments` to every appointment — the number of times that user has been marked NO_SHOW. The filtered `_count` syntax is valid in Prisma since version 4.3.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: no TypeScript errors.

---

## Task 4: Update controller and tests

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.controller.ts` — `updateStatus` controller (~line 122)
- Modify: `apps/server/src/modules/appointments/appointments.service.test.ts`

- [ ] **Step 1: Add NO_SHOW to valid statuses in controller**

Find:
```ts
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
```

Change to:
```ts
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
```

- [ ] **Step 2: Fix the mock setup in appointments.service.test.ts (mandatory)**

The existing mock only mocks `prisma.appointment.findMany`, but `getAllAppointments` calls `prisma.$transaction([findMany, count])`. This means all existing tests currently fail at runtime. Replace the entire mock at the top of the file:

Find the existing mock block (lines 1-12 approximately):
```ts
vi.mock('../../config/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
    },
  },
}));
```

Change to:
```ts
vi.mock('../../config/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((arr: unknown[]) => Promise.all(arr as Promise<unknown>[])),
  },
}));
```

Also update the `beforeEach` blocks that call `vi.clearAllMocks()` — after clearing, the mocks need default return values again. Update the `beforeEach` in the existing `getAllAppointments` describe block:

Find:
```ts
beforeEach(() => {
  vi.clearAllMocks();
  (prisma.appointment.findMany as any).mockResolvedValue([]);
});
```

Change to:
```ts
beforeEach(() => {
  vi.clearAllMocks();
  (prisma.appointment.findMany as any).mockResolvedValue([]);
  (prisma.appointment.count as any).mockResolvedValue(0);
});
```

- [ ] **Step 3: Run existing tests to confirm they pass with the new mock**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/appointments/appointments.service.test.ts
```

Expected: all 4 existing tests pass.

- [ ] **Step 4: Add NO_SHOW filter test**

At the end of `appointments.service.test.ts`, add:

```ts
describe('NO_SHOW status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointment.findMany as any).mockResolvedValue([]);
    (prisma.appointment.count as any).mockResolvedValue(0);
  });

  it('filters by NO_SHOW status when provided', async () => {
    await getAllAppointments({ status: 'NO_SHOW' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'NO_SHOW' } })
    );
  });
});
```

- [ ] **Step 5: Run all tests**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/appointments/appointments.service.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit backend changes**

```bash
cd cosmo-app
git add apps/server/prisma/schema.prisma
git add apps/server/src/modules/appointments/appointments.service.ts
git add apps/server/src/modules/appointments/appointments.controller.ts
git add apps/server/src/modules/appointments/appointments.service.test.ts
git commit -m "feat: add NO_SHOW appointment status with no-show count on user"
```

---

## Task 5: Update frontend

**Files:**
- Modify: `apps/web/src/pages/admin/Appointments.tsx`

### 5a: Add NO_SHOW to config maps

- [ ] **Step 1: Extend STATUS_LABELS**

Find:
```ts
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
};
```

Change to:
```ts
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  CANCELLED: 'Anulowana',
  COMPLETED: 'Zakończona',
  NO_SHOW: 'Nie stawiła się',
};
```

- [ ] **Step 2: Extend STATUS_COLORS**

Find:
```ts
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  COMPLETED: 'bg-primary/10 text-primary border-primary/30',
};
```

Change to:
```ts
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  COMPLETED: 'bg-primary/10 text-primary border-primary/30',
  NO_SHOW: 'bg-purple-100 text-purple-800 border-purple-300',
};
```

- [ ] **Step 3: Extend ALL_STATUSES**

Find:
```ts
const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
```

Change to:
```ts
const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const;
```

### 5b: Fix active/archive split to include NO_SHOW in archive

- [ ] **Step 4: Update ListView active/archive predicates**

`NO_SHOW` is a terminal status like `COMPLETED` and must appear in the archive section, not the active section. In `ListView`, find:

```ts
const activeFiltered = filtered.filter((a) => a.status !== 'COMPLETED');
const archivedFiltered = filtered.filter((a) => a.status === 'COMPLETED');
```

Change to:
```ts
const ARCHIVED_STATUSES = ['COMPLETED', 'NO_SHOW'];
const activeFiltered = filtered.filter((a) => !ARCHIVED_STATUSES.includes(a.status));
const archivedFiltered = filtered.filter((a) => ARCHIVED_STATUSES.includes(a.status));
```

### 5c: Add no-show warning banner to AppointmentRow

- [ ] **Step 5: Add warning banner inside AppointmentRow**

The user's no-show count is at `a.user?._count?.appointments`. The banner only shows on PENDING or CONFIRMED appointments (where there is still time to act).

Find the opening outer div of `AppointmentRow`'s return — the one with class `flex flex-col gap-3 p-4 border rounded-xl ...`. Add the warning banner as its **first child**, before the existing `<div className="flex flex-col sm:flex-row...">`:

```tsx
{(() => {
  const noShowCount = a.user?._count?.appointments ?? 0;
  const isActive = a.status === 'PENDING' || a.status === 'CONFIRMED';
  if (noShowCount === 0 || !isActive) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 text-xs">
      <span className="text-base leading-none mt-0.5">⚠</span>
      <div>
        <span className="font-semibold">
          Ta klientka nie stawiła się {noShowCount === 1 ? '1 raz' : `${noShowCount} razy`} na poprzednich wizytach.
        </span>
        {' '}Upewnij się, że tym razem przyjdzie — zadzwoń lub wyślij SMS z potwierdzeniem.
      </div>
    </div>
  );
})()}
```

- [ ] **Step 6: Verify in browser**

Start dev server:
```bash
cd cosmo-app && pnpm dev
```

1. Go to `/admin/wizyty`
2. Find a CONFIRMED or PENDING appointment — change status to `Nie stawiła się` → purple badge appears, appointment moves to archive section
3. Create a new appointment for the same user (via calendar or BookingWizard)
4. Verify the orange warning banner appears on the new appointment card with the correct count

- [ ] **Step 7: Commit frontend changes**

```bash
cd cosmo-app
git add apps/web/src/pages/admin/Appointments.tsx
git commit -m "feat: show no-show warning banner on subsequent appointments"
```

---

## Done

All changes complete. The feature delivers:
- Admins can mark any PENDING/CONFIRMED appointment as `Nie stawiła sie` (purple badge)
- Once marked NO_SHOW (or COMPLETED), status cannot be changed — it is terminal
- NO_SHOW appointments appear in the archive section alongside COMPLETED appointments
- Any future PENDING/CONFIRMED appointment for a user with no-show history displays an orange warning banner with the exact count and a reminder to confirm attendance by phone/SMS
