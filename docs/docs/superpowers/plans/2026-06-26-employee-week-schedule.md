# Employee Week-by-Week Schedule Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the employee schedule editor with a week-by-week UI where employees explicitly configure each week's availability, and days without a WorkDay record are unavailable to clients.

**Architecture:** Remove the weekly template fallback from `getAvailabilityForDuration` (if no `EmployeeWorkDay` exists for a date → unavailable). Add two bulk endpoints (`upsert-week`, `block-month`). Rewrite `Schedule.tsx` from a monthly calendar with template section to a week-by-week day editor.

**Tech Stack:** Node.js/Express/Prisma (backend), React 19/TypeScript/Vite + TanStack Query (frontend), date-fns, Tailwind CSS, vitest (tests)

---

## File Map

| File | Action | Summary |
|------|--------|---------|
| `apps/server/src/modules/employees/employees.service.ts` | Modify | Extract `resolveEmployeeBlocks` helper, change availability to explicit-only, add `upsertWeek` + `blockMonth` |
| `apps/server/src/modules/employees/employees.weekslots.test.ts` | Modify | Add tests for `resolveEmployeeBlocks` |
| `apps/server/src/modules/employees/employees.controller.ts` | Modify | Add 4 handlers: `upsertMyWeek`, `blockMyMonth`, `upsertWeekForEmployee`, `blockMonthForEmployee` |
| `apps/server/src/modules/employees/employees.router.ts` | Modify | Register 4 new routes (POST) |
| `apps/web/src/api/employees.api.ts` | Modify | Add `upsertMyWeek` + `blockMyMonth` methods |
| `apps/web/src/pages/employee/Schedule.tsx` | Modify (full rewrite) | Week navigator, 7-day editor, block-month modal |

---

## Task 1: Extract and test `resolveEmployeeBlocks` helper

This is the core semantic change. Extract a pure function that determines available time blocks for a date. No weekly template fallback.

**Files:**
- Modify: `apps/server/src/modules/employees/employees.service.ts`
- Modify: `apps/server/src/modules/employees/employees.weekslots.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `employees.weekslots.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateWeekSlotsCount, resolveEmployeeBlocks } from './employees.service';

// ... existing calculateWeekSlotsCount tests ...

describe('resolveEmployeeBlocks', () => {
  it('returns null when no workday exists — employee unavailable by default', () => {
    expect(resolveEmployeeBlocks(null)).toBeNull();
  });

  it('returns null when workday has isWorking=false', () => {
    expect(resolveEmployeeBlocks({ isWorking: false, timeBlocks: null })).toBeNull();
  });

  it('returns timeBlocks when workday isWorking=true', () => {
    const blocks = [{ start: '09:00', end: '17:00' }];
    expect(resolveEmployeeBlocks({ isWorking: true, timeBlocks: blocks })).toEqual(blocks);
  });

  it('returns DEFAULT_TIME_BLOCKS when isWorking=true but timeBlocks is null', () => {
    const result = resolveEmployeeBlocks({ isWorking: true, timeBlocks: null });
    expect(result).toEqual([{ start: '09:00', end: '18:00' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: FAIL — `resolveEmployeeBlocks is not exported`

- [ ] **Step 3: Export `resolveEmployeeBlocks` from service**

In `employees.service.ts`, find the `// ─── Availability ─────` section.

Add this exported function **before** `getAvailabilityForDuration`:

```typescript
export interface WorkDayLike {
  isWorking: boolean;
  timeBlocks: unknown;
}

export function resolveEmployeeBlocks(workDay: WorkDayLike | null): TimeBlock[] | null {
  if (!workDay) return null;
  if (!workDay.isWorking) return null;
  const blocks = workDay.timeBlocks as TimeBlock[] | null;
  return blocks && blocks.length > 0 ? blocks : DEFAULT_TIME_BLOCKS;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: All tests PASS including the 4 new ones.

- [ ] **Step 5: Replace old availability logic with `resolveEmployeeBlocks`**

In `getAvailabilityForDuration`, find the block that starts with:

```typescript
let blocks: TimeBlock[] = DEFAULT_TIME_BLOCKS;

if (employeeId) {
  // Check day-specific override first
  const workDay = await prisma.employeeWorkDay.findUnique({
```

Replace the entire `if (employeeId) { ... }` block (the one that sets `blocks`) with:

```typescript
let blocks: TimeBlock[];

if (employeeId) {
  const workDay = await prisma.employeeWorkDay.findUnique({
    where: { employeeId_date: { employeeId, date: normalized } },
  });

  const resolved = resolveEmployeeBlocks(workDay);
  if (resolved === null) return [];
  blocks = resolved;
}
```

Note: Remove the `weekly` schedule queries entirely from this function — they are no longer used.

- [ ] **Step 6: Run tests again to ensure nothing broke**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/employees/employees.service.ts
git add apps/server/src/modules/employees/employees.weekslots.test.ts
git commit -m "feat(employees): explicit-only availability — no workday = unavailable

Extract resolveEmployeeBlocks helper; remove weekly template fallback
from getAvailabilityForDuration.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add `upsertWeek` and `blockMonth` service functions

**Files:**
- Modify: `apps/server/src/modules/employees/employees.service.ts`

- [ ] **Step 1: Add `upsertWeek` function**

Add after the `deleteWorkDay` function in `employees.service.ts`:

```typescript
export const upsertWeek = async (
  employeeId: string,
  days: Array<{
    date: string;
    isWorking: boolean;
    timeBlocks?: TimeBlock[];
    note?: string;
  }>
): Promise<void> => {
  if (!days.length) return;
  await prisma.$transaction(
    days.map((d) => {
      const normalized = normalizeDate(d.date);
      return prisma.employeeWorkDay.upsert({
        where: { employeeId_date: { employeeId, date: normalized } },
        create: {
          employeeId,
          date: normalized,
          isWorking: d.isWorking,
          timeBlocks: (d.isWorking ? (d.timeBlocks ?? DEFAULT_TIME_BLOCKS) : null) as any,
          note: d.note ?? null,
        },
        update: {
          isWorking: d.isWorking,
          timeBlocks: (d.isWorking ? (d.timeBlocks ?? DEFAULT_TIME_BLOCKS) : null) as any,
          note: d.note ?? null,
        },
      });
    })
  );
};
```

- [ ] **Step 2: Add `blockMonth` function**

Add after `upsertWeek`:

```typescript
export const blockMonth = async (
  employeeId: string,
  year: number,
  month: number
): Promise<void> => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }

  await prisma.$transaction(
    days.map((date) =>
      prisma.employeeWorkDay.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: { employeeId, date, isWorking: false, timeBlocks: null },
        update: { isWorking: false, timeBlocks: null },
      })
    )
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/employees/employees.service.ts
git commit -m "feat(employees): add upsertWeek and blockMonth service functions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add controller handlers

**Files:**
- Modify: `apps/server/src/modules/employees/employees.controller.ts`

- [ ] **Step 1: Add self-service handlers**

Add after `removeMyWorkDay` handler at the bottom of the "Employee self-service" section:

```typescript
export const upsertMyWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const { days } = req.body;
    if (!Array.isArray(days)) throw new AppError('days musi być tablicą', 400);
    await employeesService.upsertWeek(employee.id, days);
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const blockMyMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeesService.getEmployeeByUserId(req.user!.id);
    const { year, month } = req.body;
    if (!year || !month) throw new AppError('year i month są wymagane', 400);
    await employeesService.blockMonth(employee.id, Number(year), Number(month));
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Add admin handlers**

Add after `removeWorkDay` handler in the admin section:

```typescript
export const upsertWeekForEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days } = req.body;
    if (!Array.isArray(days)) throw new AppError('days musi być tablicą', 400);
    await employeesService.upsertWeek(req.params.id, days);
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const blockMonthForEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.body;
    if (!year || !month) throw new AppError('year i month są wymagane', 400);
    await employeesService.blockMonth(req.params.id, Number(year), Number(month));
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/employees/employees.controller.ts
git commit -m "feat(employees): add upsertWeek and blockMonth controller handlers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Register new routes

**Files:**
- Modify: `apps/server/src/modules/employees/employees.router.ts`

- [ ] **Step 1: Add self-service routes**

In the "Employee self-service" section, add after existing `/me/` routes:

```typescript
router.post('/me/schedule/week', authenticate, requireEmployee, ctrl.upsertMyWeek);
router.post('/me/schedule/block-month', authenticate, requireEmployee, ctrl.blockMyMonth);
```

**Important:** These must be added **before** the `/:id` catch-all routes.

- [ ] **Step 2: Add admin routes**

In the "Admin" section, add after `/:id/schedule/:dayId` DELETE:

```typescript
router.post('/:id/schedule/week', authenticate, requireAdmin, ctrl.upsertWeekForEmployee);
router.post('/:id/schedule/block-month', authenticate, requireAdmin, ctrl.blockMonthForEmployee);
```

- [ ] **Step 3: Verify TypeScript compiles and run tests**

```bash
cd cosmo-app/apps/server
pnpm build
pnpm vitest run src/modules/employees/employees.weekslots.test.ts
```

Expected: Build succeeds, all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/employees/employees.router.ts
git commit -m "feat(employees): register upsert-week and block-month endpoints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update frontend API client

**Files:**
- Modify: `apps/web/src/api/employees.api.ts`

- [ ] **Step 1: Add `WeekDayInput` interface**

Add after the `WorkDayInput` interface:

```typescript
export interface WeekDayInput {
  date: string;
  isWorking: boolean;
  timeBlocks?: TimeBlock[];
  note?: string;
}
```

- [ ] **Step 2: Add API methods**

In the `// ── My schedule (employee self-service) ──` section, add after `deleteMyWorkDay`:

```typescript
upsertMyWeek: async (days: WeekDayInput[]): Promise<void> => {
  await api.post('/employees/me/schedule/week', { days });
},
blockMyMonth: async (year: number, month: number): Promise<void> => {
  await api.post('/employees/me/schedule/block-month', { year, month });
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/api/employees.api.ts
git commit -m "feat(employees): add upsertMyWeek and blockMyMonth API methods

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Rewrite Schedule.tsx with week-by-week editor

**Files:**
- Modify: `apps/web/src/pages/employee/Schedule.tsx` (full rewrite)

- [ ] **Step 1: Replace the file with the new implementation**

Replace the entire contents of `apps/web/src/pages/employee/Schedule.tsx` with:

```tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  isBefore,
  startOfToday,
  isSameDay,
  getMonth,
  getYear,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { employeesApi, TimeBlock, WorkDay, WeekDayInput } from '@/api/employees.api';
import { TimeBlocksEditor } from '@/components/schedule/TimeBlocksEditor';
import { Button } from '@/components/ui/button';

const DEFAULT_BLOCKS: TimeBlock[] = [{ start: '09:00', end: '18:00' }];
const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// ─── Helper: get ISO week start (Monday) ─────────────────────────────────────

function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// ─── Day row ──────────────────────────────────────────────────────────────────

interface DayState {
  isWorking: boolean;
  timeBlocks: TimeBlock[];
}

function DayRow({
  date,
  state,
  readonly,
  onChange,
}: {
  date: Date;
  state: DayState;
  readonly: boolean;
  onChange: (patch: Partial<DayState>) => void;
}) {
  const label = DAY_NAMES[(date.getDay() + 6) % 7];
  const dateLabel = format(date, 'd MMMM', { locale: pl });
  const isToday = isSameDay(date, new Date());

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${isToday ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-40">
          <p className="font-medium text-sm">{label}</p>
          <p className={`text-xs ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            {dateLabel}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            disabled={readonly}
            onClick={() => onChange({ isWorking: true, timeBlocks: state.timeBlocks.length ? state.timeBlocks : DEFAULT_BLOCKS })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              state.isWorking
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'border-border hover:bg-accent'
            }`}
          >
            Pracuję
          </button>
          <button
            disabled={readonly}
            onClick={() => onChange({ isWorking: false })}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              !state.isWorking
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'border-border hover:bg-accent'
            }`}
          >
            Wolne
          </button>
        </div>
      </div>

      {state.isWorking && !readonly && (
        <TimeBlocksEditor
          blocks={state.timeBlocks}
          onChange={(blocks) => onChange({ timeBlocks: blocks })}
        />
      )}

      {state.isWorking && readonly && (
        <p className="text-xs text-muted-foreground pl-1">
          {state.timeBlocks.map((b) => `${b.start}–${b.end}`).join(', ')}
        </p>
      )}
    </div>
  );
}

// ─── Block month modal ────────────────────────────────────────────────────────

function BlockMonthModal({
  year,
  month,
  onConfirm,
  onCancel,
  isPending,
}: {
  year: number;
  month: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const monthLabel = format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: pl });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={20} className="text-destructive" />
          <h3 className="font-semibold text-lg">Zablokuj miesiąc</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Wszystkie dni w miesiącu <strong className="capitalize">{monthLabel}</strong> zostaną oznaczone jako wolne.
          Klienci nie będą mogli rezerwować wizyt w tym czasie.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Blokuję...' : 'Zablokuj'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Anuluj</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const EmployeeSchedule = () => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showBlockModal, setShowBlockModal] = useState(false);
  const qc = useQueryClient();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const today = startOfToday();
  const isPastWeek = isBefore(weekEnd, today);

  // Determine which months to load (week may span two months)
  const months = useMemo(() => {
    const months = new Set<string>();
    months.add(format(weekStart, 'yyyy-MM'));
    months.add(format(weekEnd, 'yyyy-MM'));
    return [...months];
  }, [weekStart, weekEnd]);

  // Load all needed months
  const queries = months.map((m) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['my-schedule', m],
      queryFn: () => employeesApi.getMySchedule(m),
    })
  );

  const isLoading = queries.some((q) => q.isLoading);
  const employee = queries[0].data?.employee;

  // Merge workDays from all loaded months
  const allWorkDays: WorkDay[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: WorkDay[] = [];
    for (const q of queries) {
      for (const wd of q.data?.workDays ?? []) {
        if (!seen.has(wd.id)) {
          seen.add(wd.id);
          merged.push(wd);
        }
      }
    }
    return merged;
  }, [queries]);

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Build initial day states from workDays
  const initDayStates = (): Record<string, DayState> => {
    const states: Record<string, DayState> = {};
    for (const day of weekDays) {
      const key = format(day, 'yyyy-MM-dd');
      const wd = allWorkDays.find((w) => isSameDay(new Date(w.date), day));
      states[key] = {
        isWorking: wd?.isWorking ?? false,
        timeBlocks: wd?.timeBlocks ?? DEFAULT_BLOCKS,
      };
    }
    return states;
  };

  const [dayStates, setDayStates] = useState<Record<string, DayState>>(initDayStates);

  // Re-sync when data loads
  const dataKey = allWorkDays.map((w) => w.id + w.isWorking).join(',');
  useMemo(() => {
    if (!isLoading) setDayStates(initDayStates());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, weekStart]);

  const hasAnyConfiguration = weekDays.some((day) => {
    const key = format(day, 'yyyy-MM-dd');
    return allWorkDays.some((w) => isSameDay(new Date(w.date), day));
  });

  // Mutations
  const { mutate: saveWeek, isPending: saving } = useMutation({
    mutationFn: (days: WeekDayInput[]) => employeesApi.upsertMyWeek(days),
    onSuccess: () => {
      months.forEach((m) => qc.invalidateQueries({ queryKey: ['my-schedule', m] }));
      toast.success('Tydzień zapisany');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  const blockMonthYear = getYear(weekStart);
  const blockMonthMonth = getMonth(weekStart) + 1;

  const { mutate: doBlockMonth, isPending: blocking } = useMutation({
    mutationFn: () => employeesApi.blockMyMonth(blockMonthYear, blockMonthMonth),
    onSuccess: () => {
      months.forEach((m) => qc.invalidateQueries({ queryKey: ['my-schedule', m] }));
      setShowBlockModal(false);
      toast.success('Miesiąc zablokowany');
    },
    onError: () => toast.error('Błąd blokowania'),
  });

  const handleSaveWeek = () => {
    const days: WeekDayInput[] = weekDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const state = dayStates[key];
      return {
        date: key,
        isWorking: state.isWorking,
        timeBlocks: state.isWorking ? state.timeBlocks : undefined,
      };
    });
    saveWeek(days);
  };

  const updateDay = (key: string, patch: Partial<DayState>) => {
    setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  if (isLoading)
    return <div className="animate-pulse py-12 text-center text-muted-foreground">Ładowanie...</div>;

  const weekLabel = `${format(weekStart, 'd MMM', { locale: pl })} – ${format(weekEnd, 'd MMM yyyy', { locale: pl })}`;

  return (
    <div className="space-y-6 animate-enter max-w-2xl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-primary">Mój Terminarz</h1>
        {employee && (
          <p className="text-muted-foreground mt-1">
            Witaj, <strong>{employee.name}</strong>
          </p>
        )}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        {/* Week navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => getWeekStart(subWeeks(w, 1)))}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-base capitalize min-w-[180px] text-center">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekStart((w) => getWeekStart(addWeeks(w, 1)))}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
            onClick={() => setShowBlockModal(true)}
          >
            <Lock size={13} />
            Zablokuj miesiąc
          </Button>
        </div>

        {/* Info banner when week has no data */}
        {!hasAnyConfiguration && !isPastWeek && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Ten tydzień nie ma jeszcze żadnych wpisów — klienci widzą brak dostępnych terminów.</span>
          </div>
        )}

        {isPastWeek && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 border px-3 py-2.5 text-sm text-muted-foreground">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Miniony tydzień — tryb tylko do odczytu.</span>
          </div>
        )}

        {/* Day rows */}
        <div className="space-y-3">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            return (
              <DayRow
                key={key}
                date={day}
                state={dayStates[key] ?? { isWorking: false, timeBlocks: DEFAULT_BLOCKS }}
                readonly={isPastWeek}
                onChange={(patch) => updateDay(key, patch)}
              />
            );
          })}
        </div>

        {/* Save button */}
        {!isPastWeek && (
          <div className="pt-1">
            <Button onClick={handleSaveWeek} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Zapisuję...' : 'Zapisz tydzień'}
            </Button>
          </div>
        )}
      </div>

      {/* Block month modal */}
      {showBlockModal && (
        <BlockMonthModal
          year={blockMonthYear}
          month={blockMonthMonth}
          onConfirm={doBlockMonth}
          onCancel={() => setShowBlockModal(false)}
          isPending={blocking}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web
pnpm build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual test in dev**

```bash
cd cosmo-app
pnpm dev
```

1. Log in as an employee
2. Navigate to `/employee` → Terminarz
3. Verify: week navigation (← / →) works, week label updates
4. Verify: banner "brak wpisów" shows for empty weeks
5. Toggle some days to "Pracuję", set hours
6. Click "Zapisz tydzień" → success toast appears
7. Navigate away and back → saved state persists
8. Click "Zablokuj miesiąc" → modal appears → confirm → success toast

- [ ] **Step 4: Verify client calendar**

1. Log in as a regular user
2. Navigate to `/rezerwacja` (BookingWizard)
3. For a week with no WorkDays → all days should show as `off` (grey/unavailable)
4. For a week with configured days → days with `isWorking=true` show available slots

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/employee/Schedule.tsx
git commit -m "feat(employee): week-by-week schedule editor

Replace monthly calendar + template with week navigation.
Employees explicitly configure each week; unconfigured days
are unavailable to clients.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `pnpm vitest run` passes in `apps/server`
- [ ] `pnpm build` passes in both `apps/web` and `apps/server`
- [ ] Employee can navigate weeks and save availability
- [ ] Employee can block a month
- [ ] Client's booking calendar shows `off` for days without WorkDay records
- [ ] Past weeks are read-only in the employee UI
- [ ] Banner shows for unconfigured weeks
