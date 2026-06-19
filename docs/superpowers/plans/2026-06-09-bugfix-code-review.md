# Bugfix: Code Review Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 confirmed bugs found during full-codebase code review (security, logic, and correctness issues).

**Architecture:** Each task is self-contained and targets a specific file. Tasks 1-5 are backend, Tasks 6-7 are frontend. No new dependencies required.

**Tech Stack:** TypeScript, Express 5, Prisma, React 19, Zustand, TanStack Query, axios

---

## False Positives (DO NOT FIX — already correct)
- `recommended-slides/router.ts` — PATCH/DELETE ARE protected via `router.use(authenticate, requireAdmin)` on line 13
- Auth rate limiting — `authRateLimiter` IS applied in `auth.router.ts` on all endpoints
- `adjustPoints` negative points — check `if (newPoints < 0)` IS present
- `activateCoupon` race condition — reward check IS inside `prisma.$transaction`
- `Dashboard.tsx` null crash — `user?.name?.split(' ')[0]` is safe with optional chaining
- `BookingWizard.tsx` `state.time.split` — null guard at line 1086: `if (!state.service || !state.date || !state.time) return;`

---

## Task 1: Fix Discount Code TOCTOU Race Condition

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts:95-111`

**Problem:** The discount code usage check (`findUnique`) and creation (`create`) happen OUTSIDE the main `prisma.$transaction` block. Two concurrent booking requests for the same user+code could both pass the `!alreadyUsed` check before either inserts the usage record.

**Fix:** Wrap the discount code handling in a separate transaction block that relies on the unique constraint `discountCodeId_userId` as the ultimate guard, catching constraint violations gracefully.

- [ ] **Step 1: Read the current discount code block**

Open `apps/server/src/modules/appointments/appointments.service.ts` and locate lines 95-111:
```ts
if (discountCodeId) {
  const code = await prisma.discountCode.findUnique({ where: { id: discountCodeId } });
  if (code && code.isActive && (!code.lockedToUserId || code.lockedToUserId === userId)) {
    const alreadyUsed = await prisma.discountCodeUsage.findUnique({
      where: { discountCodeId_userId: { discountCodeId, userId } },
    });
    if (!alreadyUsed) {
      await prisma.discountCodeUsage.create({
        data: { discountCodeId, userId, appointmentId: appointment.id },
      });
    }
  }
}
```

- [ ] **Step 2: Replace with atomic upsert using unique constraint**

Replace the entire block with:
```ts
if (discountCodeId) {
  const code = await prisma.discountCode.findUnique({ where: { id: discountCodeId } });
  if (code && code.isActive && (!code.lockedToUserId || code.lockedToUserId === userId)) {
    // Use upsert to atomically guard against concurrent double-use.
    // The unique constraint on (discountCodeId, userId) is the final guard.
    await prisma.discountCodeUsage.upsert({
      where: { discountCodeId_userId: { discountCodeId, userId } },
      create: { discountCodeId, userId, appointmentId: appointment.id },
      update: {}, // already used — no-op, do not throw
    });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run from `cosmo-app/apps/server/`:
```bash
pnpm build
```
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/appointments/appointments.service.ts
git commit -m "fix: use upsert to prevent discount code double-use race condition"
```

---

## Task 2: Fix External Client passwordHash Placeholder

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts:293`

**Problem:** `createExternalClientAppointment` creates user accounts with `passwordHash: '!'` — not a valid bcrypt hash. If DB is compromised or password check is attempted, this leaks that the account is external. Setting it to `null` is cleaner and the existing `changeUserPassword` already guards against null hashes.

- [ ] **Step 1: Locate the line**

In `apps/server/src/modules/appointments/appointments.service.ts`, find line 293:
```ts
passwordHash: '!',
```

- [ ] **Step 2: Change to null**

Replace with:
```ts
passwordHash: null,
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```
Expected: no errors (schema allows `passwordHash` to be nullable — Google OAuth users already use null)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/appointments/appointments.service.ts
git commit -m "fix: use null passwordHash for external client accounts instead of invalid placeholder"
```

---

## Task 3: Fix getAllAppointments Missing Pagination Metadata

**Files:**
- Modify: `apps/server/src/modules/appointments/appointments.service.ts` (the `getAllAppointments` function, lines ~155-175)

**Problem:** `getAllAppointments` accepts `page`/`limit` filter params but returns a raw array. Clients can't determine if there are more pages. Every other paginated endpoint (`skin-journal`, `notifications`) returns `{ data, totalPages }`.

- [ ] **Step 1: Read the current function**

Locate `getAllAppointments` in `apps/server/src/modules/appointments/appointments.service.ts`. Current implementation:
```ts
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

- [ ] **Step 2: Add count query and return pagination metadata**

Replace the function body with:
```ts
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

  const [data, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      orderBy: { date: 'desc' },
      take,
      skip,
      include: {
        ...appointmentInclude,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  const totalPages = take ? Math.ceil(total / take) : 1;
  return { data, total, totalPages };
};
```

- [ ] **Step 3: Update the controller to pass through the new shape**

Open `apps/server/src/modules/appointments/appointments.controller.ts`, find the `getAll` handler, and ensure it sends `res.json({ status: 'success', data: result })` where `result` is the new `{ data, total, totalPages }` object. Check the current shape — if it already does `res.json({ status: 'success', data: result })`, no change needed in controller.

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/appointments/appointments.service.ts apps/server/src/modules/appointments/appointments.controller.ts
git commit -m "fix: getAllAppointments now returns pagination metadata (total, totalPages)"
```

---

## Task 4: Add Pagination to getAllUsers

**Files:**
- Modify: `apps/server/src/modules/users/users.service.ts` (the `getAllUsers` function, lines ~38-60)
- Modify: `apps/server/src/modules/users/users.controller.ts` (the handler that calls `getAllUsers`)

**Problem:** `getAllUsers` fetches every active user in one query. As the user base grows this will slow admin panel significantly and could cause out-of-memory issues.

- [ ] **Step 1: Update getAllUsers signature and body**

Current function starts at line ~38 in `users.service.ts`. Replace with:
```ts
export const getAllUsers = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: { accountStatus: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarPath: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        createdAt: true,
        ambassadorCode: true,
        referralCount: true,
        termsAcceptedAt: true,
        marketingConsent: true,
        photoConsent: true,
        cardAllergies: true,
        cardConditions: true,
        cardPreferences: true,
        cardStaffNotes: true,
        _count: {
          select: {
            appointments: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
  ]);

  return { data: users, total, totalPages: Math.ceil(total / limit) };
};
```

- [ ] **Step 2: Update the users controller getAll handler**

Open `apps/server/src/modules/users/users.controller.ts`. Find the handler that calls `getAllUsers()`. Update to pass query params:
```ts
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await usersService.getAllUsers(page, limit);
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/users/users.service.ts apps/server/src/modules/users/users.controller.ts
git commit -m "fix: add pagination to getAllUsers to prevent full table scan"
```

---

## Task 5: Fix Loyalty Tier Calculation (Visits → Points)

**Files:**
- Modify: `apps/server/src/modules/loyalty/loyalty.service.ts` (lines 10-19)
- Modify: `apps/server/src/modules/appointments/appointments.service.ts` (lines ~505-515 in updateStatus)

**Problem:** `getTierForVisits(visits)` uses visit COUNT thresholds (30/100) to determine tier. The documented design (CLAUDE.md) and the `loyaltyPoints` field on User indicate tiers should be based on ACCUMULATED POINTS (500/1500). The function name itself is misleading.

**Important:** This changes tier promotion speed. Existing users already have high enough points from visit history to maintain or improve their current tier.

- [ ] **Step 1: Update TIERS constant and rename function in loyalty.service.ts**

In `apps/server/src/modules/loyalty/loyalty.service.ts`, replace lines 10-19:

Old:
```ts
export const TIERS = {
  BRONZE: { min: 0, max: 29, discount: 0.05 },
  SILVER: { min: 30, max: 99, discount: 0.10 },
  GOLD: { min: 100, max: Infinity, discount: 0.15 },
} as const;

export const getTierForVisits = (visits: number): 'BRONZE' | 'SILVER' | 'GOLD' => {
  if (visits >= 100) return 'GOLD';
  if (visits >= 30) return 'SILVER';
  return 'BRONZE';
};
```

New:
```ts
export const TIERS = {
  BRONZE: { min: 0, max: 499, discount: 0.05 },
  SILVER: { min: 500, max: 1499, discount: 0.10 },
  GOLD: { min: 1500, max: Infinity, discount: 0.15 },
} as const;

export const getTierForPoints = (points: number): 'BRONZE' | 'SILVER' | 'GOLD' => {
  if (points >= 1500) return 'GOLD';
  if (points >= 500) return 'SILVER';
  return 'BRONZE';
};

/** @deprecated Use getTierForPoints instead */
export const getTierForVisits = getTierForPoints;
```

(The deprecated alias keeps backward-compat for any callers while we update them.)

- [ ] **Step 2: Update the caller in appointments.service.ts**

In `apps/server/src/modules/appointments/appointments.service.ts`:

1. Change the import at line 3:
```ts
import { markCouponUsed, getTierForPoints } from '../loyalty/loyalty.service';
```

2. In the `updateStatus` function (~line 505-516), replace:
```ts
const completedVisits = await tx.appointment.count({
  where: { userId: appointment.user.id, status: 'COMPLETED' },
});
const newTier = getTierForVisits(completedVisits);
```

With:
```ts
// Tier is based on total accumulated loyalty points after this visit
const updatedUser = await tx.user.findUnique({
  where: { id: appointment.user.id },
  select: { loyaltyPoints: true },
});
const newPointsTotal = (updatedUser?.loyaltyPoints ?? 0) + points;
const newTier = getTierForPoints(newPointsTotal);
```

Note: `points` is already calculated above this block as `Math.floor(Number(appointment.service.price))`.

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/loyalty/loyalty.service.ts apps/server/src/modules/appointments/appointments.service.ts
git commit -m "fix: tier calculation now uses loyalty points (500/1500) not visit count (30/100)"
```

---

## Task 6: Fix Hardcoded Refresh Token TTL in Refresh Endpoint

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts` (the `refresh` function, ~line 130)
- Modify: `apps/server/src/utils/jwt.ts` (add `parseJwtDuration` helper) OR inline in controller

**Problem:** The `refresh` endpoint creates new DB tokens with `expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)` hardcoded. If `JWT_REFRESH_EXPIRES_IN` env var is changed, DB expiry won't match JWT expiry.

- [ ] **Step 1: Add a duration parser utility**

Check if `apps/server/src/utils/jwt.ts` exists. If it does, add to it. If not, add inline in the controller.

Add this small helper (add to `apps/server/src/utils/jwt.ts` or top of `auth.controller.ts`):
```ts
/** Parses JWT duration strings like '7d', '30d', '1h', '15m' into milliseconds */
export const parseDurationMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Unsupported duration format: ${duration}`);
  const n = parseInt(match[1], 10);
  const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * units[match[2]];
};
```

- [ ] **Step 2: Update refresh endpoint to use the helper**

In `apps/server/src/modules/auth/auth.controller.ts`, inside the `refresh` function, find:
```ts
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
```

Replace with:
```ts
expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
```

Add the import at the top of `auth.controller.ts` if helper is in `jwt.ts`:
```ts
import { parseDurationMs } from '../../utils/jwt';
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/utils/jwt.ts apps/server/src/modules/auth/auth.controller.ts
git commit -m "fix: refresh endpoint uses env.JWT_REFRESH_EXPIRES_IN for DB token TTL instead of hardcoded 7d"
```

---

## Task 7: Fix axios.ts — Pending Subscribers Hang on Refresh Failure

**Files:**
- Modify: `apps/web/src/lib/axios.ts` (~line 45-60)

**Problem:** When the token refresh fails (e.g. expired refresh token), the `catch` block does `refreshSubscribers = []` WITHOUT calling the subscriber callbacks. Any requests that were waiting for the new token (added via `addRefreshSubscriber`) will have their Promises hanging forever — they never resolve or reject.

Current catch block:
```ts
} catch (refreshError) {
  refreshSubscribers = [];           // ← subscribers cleared but never called!
  useAuthStore.getState().logout();
  window.location.href = '/auth/login';
  return Promise.reject(refreshError);
}
```

- [ ] **Step 1: Change subscriber array to store reject callbacks too**

In `apps/web/src/lib/axios.ts`, change the subscriber types:

Replace:
```ts
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}
```

With:
```ts
type Subscriber = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshSubscribers: Subscriber[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(s => s.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: unknown) {
  refreshSubscribers.forEach(s => s.reject(err));
  refreshSubscribers = [];
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (err: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}
```

- [ ] **Step 2: Update the subscriber usage in the interceptor**

In the interceptor, replace the `isRefreshing` branch:

Old:
```ts
if (isRefreshing) {
  return new Promise((resolve) => {
    addRefreshSubscriber((token: string) => {
      originalRequest.headers['Authorization'] = `Bearer ${token}`;
      resolve(api(originalRequest));
    });
  });
}
```

New:
```ts
if (isRefreshing) {
  return new Promise((resolve, reject) => {
    addRefreshSubscriber(
      (token: string) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        resolve(api(originalRequest));
      },
      (err: unknown) => reject(err),
    );
  });
}
```

- [ ] **Step 3: Update the catch block to call onRefreshFailed**

Old:
```ts
} catch (refreshError) {
  refreshSubscribers = [];
  useAuthStore.getState().logout();
  window.location.href = '/auth/login';
  return Promise.reject(refreshError);
}
```

New:
```ts
} catch (refreshError) {
  onRefreshFailed(refreshError);
  useAuthStore.getState().logout();
  window.location.href = '/auth/login';
  return Promise.reject(refreshError);
}
```

- [ ] **Step 4: Verify TypeScript compiles (frontend)**

Run from `cosmo-app/apps/web/`:
```bash
pnpm build
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/axios.ts
git commit -m "fix: reject pending axios subscribers when token refresh fails to prevent hanging promises"
```

---

## Task 8: Fix UserLayout.tsx — Missing useEffect Dependencies

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx` (~line 133-137)

**Problem:** The effect that merges `freshUser` data into the Zustand store is missing `storeUser` and `setUser` in the dependency array. React's exhaustive-deps rule would flag this as a warning. While `setUser` from Zustand is stable, missing `storeUser` means the merge uses a stale closure value on re-renders.

Current code:
```ts
useEffect(() => {
  if (freshUser && storeUser) {
    setUser({ ...storeUser, ...freshUser });
  }
}, [freshUser]);
```

The correct fix uses a ref to snapshot `storeUser` at merge time without adding it to deps (which would cause an infinite loop since `setUser` causes storeUser to change):

- [ ] **Step 1: Add a ref for storeUser**

At the top of `UserLayoutInner`, after the auth destructure, add:
```ts
const storeUserRef = useRef(storeUser);
storeUserRef.current = storeUser;
```

Make sure `useRef` is imported from React (it already is or add it to the import).

- [ ] **Step 2: Update the useEffect to use the ref**

Replace:
```ts
useEffect(() => {
  if (freshUser && storeUser) {
    setUser({ ...storeUser, ...freshUser });
  }
}, [freshUser]);
```

With:
```ts
useEffect(() => {
  if (freshUser && storeUserRef.current) {
    setUser({ ...storeUserRef.current, ...freshUser });
  }
}, [freshUser, setUser]);
```

This correctly:
- Includes `setUser` in deps (it's stable from Zustand so no re-render loop)
- Uses `storeUserRef.current` (always up-to-date without being a dep) to avoid the stale closure
- Does NOT include `storeUser` as a dep (would cause infinite loop)

- [ ] **Step 3: Verify frontend builds**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "fix: use ref pattern in UserLayout useEffect to avoid stale closure and missing deps"
```

---

## Final Verification

- [ ] **Run full build from monorepo root**

```bash
cd cosmo-app && pnpm build
```
Expected: both `apps/server` and `apps/web` build successfully with no TypeScript errors.

- [ ] **Run backend tests**

```bash
cd cosmo-app/apps/server && pnpm test
```
Expected: all tests pass.
