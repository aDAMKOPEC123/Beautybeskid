# Admin-Approval Registration System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace open registration (instant login) with admin-approval flow; add admin ability to create accounts directly with forced password change.

**Architecture:** Add `AccountStatus` enum and `mustChangePassword` field to the User model. Backend guards login/refresh on status. Four new admin endpoints (pending list, approve, reject, admin-create). Frontend: register shows "pending" message, login redirects to /user/zmien-haslo if mustChangePassword, admin Users page gets Oczekujące tab + Utwórz konto modal.

**Tech Stack:** Prisma + PostgreSQL (migration), Express 5 + TypeScript (backend), Vitest (tests), React 19 + TypeScript + TanStack Query (frontend), Zustand (auth store), Zod (validation), `@cosmo/shared` (shared types)

---

## File Map

**Created:**
- `apps/server/prisma/migrations/<timestamp>_account_status/migration.sql` — Prisma migration (auto-generated, manually edited)
- `apps/server/src/modules/users/users.service.test.ts` — unit tests for new service functions
- `apps/web/src/pages/user/ChangePassword.tsx` — forced password change page

**Modified:**
- `apps/server/prisma/schema.prisma` — new enum + two new User fields
- `packages/shared/src/types/user.types.ts` — add AccountStatus enum + new User fields
- `apps/server/src/modules/auth/auth.service.ts` — registerUser (PENDING, notifications), loginUser (status guard + mustChangePassword), new adminCreateUser
- `apps/server/src/modules/auth/auth.controller.ts` — refresh adds accountStatus check
- `apps/server/src/modules/users/users.service.ts` — getUserById (new fields in select), new getPendingUsers / approveUser / rejectUser / changeUserPassword
- `apps/server/src/modules/users/users.controller.ts` — four new handler exports
- `apps/server/src/modules/users/users.router.ts` — four new routes (order: literals before /:id)
- `apps/web/src/api/users.api.ts` — getPendingUsers, approveUser, rejectUser, changePassword
- `apps/web/src/api/auth.api.ts` — adminCreateUser
- `apps/web/src/pages/auth/Register.tsx` — show pending message instead of auto-login
- `apps/web/src/pages/auth/Login.tsx` — redirect to /user/zmien-haslo if mustChangePassword
- `apps/web/src/components/layout/UserLayout.tsx` — mustChangePassword guard
- `apps/web/src/router.tsx` — add /user/zmien-haslo route
- `apps/web/src/pages/admin/Users.tsx` — Oczekujące tab + Utwórz konto modal

---

## Task 1: Prisma schema — add AccountStatus enum and User fields

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add enum to schema**

Open `apps/server/prisma/schema.prisma`. Add this enum block near the other enums (e.g., after `Role`):

```prisma
enum AccountStatus {
  PENDING
  ACTIVE
  REJECTED
}
```

- [ ] **Step 2: Add fields to User model**

In the `model User` block (around line 69), add two fields after the existing `onboardingCompleted` field:

```prisma
accountStatus      AccountStatus @default(PENDING)
mustChangePassword Boolean       @default(false)
```

- [ ] **Step 3: Generate migration (do NOT apply yet)**

```bash
cd cosmo-app/apps/server
npx prisma migrate dev --name account_status --create-only
```

Expected: creates `prisma/migrations/<timestamp>_account_status/migration.sql`

- [ ] **Step 4: Edit the generated migration file to backfill existing users**

Open the generated `migration.sql`. After the `ALTER TABLE "User" ADD COLUMN "accountStatus"...` line, add:

```sql
-- Backfill: all existing users are already active
UPDATE "User" SET "accountStatus" = 'ACTIVE';
```

Also after the `ADD COLUMN "mustChangePassword"...` line — no backfill needed (default `false` is correct).

The final migration should contain both ADD COLUMN statements plus the UPDATE.

- [ ] **Step 5: Apply migration**

```bash
npx prisma migrate dev
```

Expected output: `Database schema was successfully updated!`

- [ ] **Step 6: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/server/prisma/
git commit -m "feat: add AccountStatus enum and mustChangePassword to User model"
```

---

## Task 2: Update shared types

**Files:**
- Modify: `packages/shared/src/types/user.types.ts`

- [ ] **Step 1: Add AccountStatus enum and new User fields**

Current file (`packages/shared/src/types/user.types.ts`):
```ts
export enum Role { ... }
export enum LoyaltyTier { ... }
export interface User { ... }
```

Add the enum after `LoyaltyTier` and add two optional fields to `User`:

```ts
export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}
```

In the `User` interface, add after `onboardingCompleted?: boolean;`:
```ts
accountStatus?: AccountStatus;
mustChangePassword?: boolean;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cosmo-app
pnpm build
```

Expected: no TypeScript errors. (Build may fail on runtime things — just check for type errors specifically in shared and backend.)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/user.types.ts
git commit -m "feat: add AccountStatus and mustChangePassword to shared User type"
```

---

## Task 3: Backend — update getUserById select + add users.service functions

**Files:**
- Modify: `apps/server/src/modules/users/users.service.ts`
- Create: `apps/server/src/modules/users/users.service.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `apps/server/src/modules/users/users.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('../../utils/email', () => ({ sendEmail: vi.fn() }));

import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getPendingUsers, approveUser, rejectUser, changeUserPassword } from './users.service';

describe('getPendingUsers', () => {
  it('returns users with PENDING accountStatus', async () => {
    const mockUsers = [{ id: '1', name: 'Jan', email: 'jan@test.pl', phone: null, createdAt: new Date() }];
    (prisma.user.findMany as any).mockResolvedValue(mockUsers);
    const result = await getPendingUsers();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountStatus: 'PENDING' } })
    );
    expect(result).toEqual(mockUsers);
  });
});

describe('approveUser', () => {
  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(approveUser('nonexistent')).rejects.toThrow(AppError);
  });

  it('throws 400 if user is not PENDING', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE', email: 'a@b.pl', name: 'X' });
    await expect(approveUser('1')).rejects.toThrow('Konto nie jest w statusie oczekującym');
  });

  it('sets accountStatus to ACTIVE for PENDING user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'PENDING', email: 'a@b.pl', name: 'X' });
    (prisma.user.update as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE' });
    await approveUser('1');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '1' }, data: { accountStatus: 'ACTIVE' } })
    );
  });
});

describe('rejectUser', () => {
  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(rejectUser('nonexistent')).rejects.toThrow(AppError);
  });

  it('throws 400 if user is not PENDING', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE', email: 'a@b.pl', name: 'X' });
    await expect(rejectUser('1')).rejects.toThrow('Konto nie jest w statusie oczekującym');
  });

  it('sets accountStatus to REJECTED for PENDING user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'PENDING', email: 'a@b.pl', name: 'X' });
    (prisma.user.update as any).mockResolvedValue({ id: '1', accountStatus: 'REJECTED' });
    await rejectUser('1');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '1' }, data: { accountStatus: 'REJECTED' } })
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/users/users.service.test.ts
```

Expected: FAIL — "getPendingUsers is not a function" (functions don't exist yet)

- [ ] **Step 3: Add mustChangePassword to getUserById select**

In `apps/server/src/modules/users/users.service.ts`, in the `getUserById` function's `select` block (lines 70–90), add two fields:

```ts
accountStatus: true,
mustChangePassword: true,
```

- [ ] **Step 4: Add new service functions**

At the bottom of `apps/server/src/modules/users/users.service.ts`, add:

```ts
import { sendEmail } from '../../utils/email';
import bcrypt from 'bcryptjs';

export const getPendingUsers = async () => {
  return prisma.user.findMany({
    where: { accountStatus: 'PENDING' },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const approveUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'ACTIVE' } });

  await sendEmail(
    user.email,
    'Konto zatwierdzone — COSMO',
    `<p>Cześć ${user.name},</p><p>Twoje konto w aplikacji COSMO zostało zatwierdzone. Możesz się teraz zalogować.</p>`
  );
};

export const rejectUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'REJECTED' } });
};

export const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Nieprawidłowe obecne hasło', 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false },
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      avatarPath: true, loyaltyPoints: true, loyaltyTier: true,
      createdAt: true, ambassadorCode: true, referralCount: true,
      termsAcceptedAt: true, marketingConsent: true, photoConsent: true,
      cardAllergies: true, cardConditions: true, cardPreferences: true,
      cardStaffNotes: true, onboardingCompleted: true,
      accountStatus: true, mustChangePassword: true,
    },
  });
  return updated;
};
```

**Note:** Add `import bcrypt from 'bcryptjs';` and `import { sendEmail } from '../../utils/email';` at the top of the file if not already present.

- [ ] **Step 5: Run tests — expect them to pass**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/users/users.service.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/users/
git commit -m "feat: add getPendingUsers, approveUser, rejectUser, changeUserPassword services"
```

---

## Task 4: Backend — update auth.service (registerUser, loginUser, adminCreateUser)

**Files:**
- Modify: `apps/server/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Update registerUser — PENDING status + admin notifications**

In `registerUser` (lines 40–61 of `auth.service.ts`), inside the `prisma.$transaction`, change the `newUser` creation to include `accountStatus: 'PENDING'`:

```ts
const newUser = await tx.user.create({
  data: {
    email: data.email,
    passwordHash: hashedPassword,
    name: data.name,
    phone: data.phone,
    ambassadorCode,
    referredById: referrer?.id ?? null,
    avatarPath: data.avatarPath ?? null,
    termsAcceptedAt: data.termsAcceptedAt ?? new Date(),
    marketingConsent: data.marketingConsent ?? false,
    photoConsent: data.photoConsent ?? false,
    accountStatus: 'PENDING',
  },
});
```

After the transaction (after `return user;` — i.e., after the `prisma.$transaction` block), add admin notification creation (fire-and-forget):

```ts
// Fire-and-forget: notify all admins of new registration
prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  .then(admins =>
    Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'GENERIC',
            title: 'Nowa rejestracja',
            body: `Nowa rejestracja: ${user.name} (${user.email})`,
          },
        })
      )
    )
  )
  .catch(() => {/* ignore — don't fail registration */});

return { id: user.id, email: user.email, name: user.name, role: user.role };
```

**Note:** Add `import { prisma } from '../../config/prisma';` if not already present (it is on line 2).

- [ ] **Step 2: Update loginUser — accountStatus guard + mustChangePassword in return**

In `loginUser` (line 66), after the password check, add the status guard. The current code calls `getUserById(raw.id)` which now returns `accountStatus` and `mustChangePassword`. Add the guard after the bcrypt check:

```ts
// Check accountStatus (raw fetch before getUserById call)
if (raw.accountStatus === 'PENDING') {
  throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
}
if (raw.accountStatus === 'REJECTED') {
  throw new AppError('Konto zostało odrzucone. Skontaktuj się z salonem.', 403);
}
```

**Note:** `raw` is the direct Prisma result from `findUnique` (line 67) which now includes `accountStatus`. No select is used so all fields are returned.

Then in the return object (around line 81), add `mustChangePassword`:

```ts
return {
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarPath: user.avatarPath,
    loyaltyPoints: user.loyaltyPoints,
    loyaltyTier: user.loyaltyTier,
    ambassadorCode: user.ambassadorCode,
    referralCount: user.referralCount,
    mustChangePassword: user.mustChangePassword,  // ADD THIS
  },
  accessToken,
  refreshToken
};
```

- [ ] **Step 3: Add adminCreateUser function**

At the bottom of `auth.service.ts`, add:

```ts
export const adminCreateUser = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Użytkownik z tym adresem email już istnieje', 400);

  let ambassadorCode: string;
  while (true) {
    ambassadorCode = generateCode(8);
    const exists = await prisma.user.findUnique({ where: { ambassadorCode } });
    if (!exists) break;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      phone: data.phone ?? null,
      ambassadorCode,
      accountStatus: 'ACTIVE',
      mustChangePassword: true,
      termsAcceptedAt: new Date(),
    },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
};
```

- [ ] **Step 4: Verify TypeScript compiles**

> **Requires Task 1 fully complete** (migration applied + `prisma generate` done). If TypeScript reports errors about `accountStatus` not existing on the Prisma User type, run `npx prisma generate` in `apps/server/` first.

```bash
cd cosmo-app/apps/server
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/auth/auth.service.ts
git commit -m "feat: registerUser sets PENDING, loginUser guards by status, add adminCreateUser"
```

---

## Task 5: Backend — auth.controller refresh fix

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts`

> **Depends on Task 1 being fully complete** (migration applied + `prisma generate` run) so that `user.accountStatus` exists on the Prisma type.

- [ ] **Step 1: Add accountStatus check to refresh handler**

In `auth.controller.ts`, the `refresh` handler (lines 69–88) has a blanket `catch` that wraps **all** thrown errors as `new AppError('Nieprawidłowy token odświeżania', 401)`. We must prevent it from swallowing our intentional 403 errors.

Make two changes:

**Change 1** — After `if (!user) throw new AppError(...)` (line 77), add the status checks inside the `try` block:

```ts
if (user.accountStatus === 'PENDING') {
  throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
}
if (user.accountStatus === 'REJECTED') {
  throw new AppError('Konto zostało odrzucone. Skontaktuj się z salonem.', 403);
}
```

**Change 2** — In the `catch` block (line 86), add an `AppError` pass-through **before** the generic 401 fallback:

```ts
} catch (error) {
  if (error instanceof AppError) return next(error); // preserve intentional 403 errors
  next(new AppError('Nieprawidłowy token odświeżania', 401));
}
```

`AppError` is already imported at the top of the file.

The `prisma.user.findUnique` on line 75 does not use `select`, so all fields (including `accountStatus`) are returned once the migration is applied.

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/auth/auth.controller.ts
git commit -m "feat: block token refresh for PENDING and REJECTED accounts"
```

---

## Task 6: Backend — users.controller new handlers + users.router new routes

**Files:**
- Modify: `apps/server/src/modules/users/users.controller.ts`
- Modify: `apps/server/src/modules/users/users.router.ts`

- [ ] **Step 1: Add new handlers to users.controller.ts**

At the bottom of `apps/server/src/modules/users/users.controller.ts`, add:

```ts
import * as authService from '../auth/auth.service';

export const getPendingUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await usersService.getPendingUsers();
    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const approveUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.approveUser(req.params.id);
    res.status(200).json({ status: 'success', message: 'Konto zatwierdzone' });
  } catch (error) {
    next(error);
  }
};

export const rejectUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.rejectUser(req.params.id);
    res.status(200).json({ status: 'success', message: 'Konto odrzucone' });
  } catch (error) {
    next(error);
  }
};

export const adminCreateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await authService.adminCreateUser({ name, email, phone, password });
    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      throw new AppError('Nieprawidłowe dane', 400);
    }
    const user = await usersService.changeUserPassword(req.user!.id, currentPassword, newPassword);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
```

**Note:** Add `import * as authService from '../auth/auth.service';` to the **top-of-file import section** (alongside the existing `import * as usersService from './users.service';` line), not at the bottom of the file.

- [ ] **Step 2: Add new routes to users.router.ts**

In `apps/server/src/modules/users/users.router.ts`, add new routes **before** the existing `/:id` routes. The current file ends with:

```ts
router.get('/', requireAdmin, usersController.getAllUsers);
router.patch('/:id/card', usersController.updateUserCard);
router.get('/:id/recommendations', requireAdmin, recommendationsController.getByUser);
router.get('/:id', requireAdmin, usersController.getUserDetails);
```

Insert new routes before the `/:id` block:

```ts
// Admin: pending accounts — MUST be before /:id
router.get('/pending', requireAdmin, usersController.getPendingUsers);
router.post('/admin-create', requireAdmin, usersController.adminCreateUser);

// Change password (authenticated user, no admin required)
router.patch('/me/change-password', usersController.changePassword);

// Admin: approve/reject
router.post('/:id/approve', requireAdmin, usersController.approveUser);
router.post('/:id/reject', requireAdmin, usersController.rejectUser);
```

Final order of routes should be:
1. `/me/*` routes (existing)
2. `/` GET (existing)
3. `/pending` GET (new)
4. `/admin-create` POST (new)
5. `/me/change-password` PATCH (new)
6. `/:id/approve` POST (new)
7. `/:id/reject` POST (new)
8. `/:id/card` PATCH (existing)
9. `/:id/recommendations` GET (existing)
10. `/:id` GET (existing)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/users/
git commit -m "feat: add pending, approve, reject, admin-create, change-password endpoints"
```

---

## Task 7: Frontend — update API layer

**Files:**
- Modify: `apps/web/src/api/users.api.ts`
- Modify: `apps/web/src/api/auth.api.ts`

- [ ] **Step 1: Add new functions to users.api.ts**

In `apps/web/src/api/users.api.ts`, add to the `usersApi` object:

```ts
getPendingUsers: async () => {
  const res = await api.get('/users/pending');
  return res.data.data.users as Array<{ id: string; name: string; email: string; phone: string | null; createdAt: string }>;
},

approveUser: async (id: string) => {
  const res = await api.post(`/users/${id}/approve`);
  return res.data;
},

rejectUser: async (id: string) => {
  const res = await api.post(`/users/${id}/reject`);
  return res.data;
},

changePassword: async (data: { currentPassword: string; newPassword: string }) => {
  const res = await api.patch('/users/me/change-password', data);
  return res.data.data.user;
},
```

- [ ] **Step 2: Add adminCreateUser to auth.api.ts**

In `apps/web/src/api/auth.api.ts`, add to the `authApi` object:

```ts
adminCreateUser: async (data: { name: string; email: string; phone?: string; password: string }) => {
  const res = await api.post('/users/admin-create', data);
  return res.data.data.user;
},
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/api/
git commit -m "feat: add pending/approve/reject/changePassword/adminCreateUser to API layer"
```

---

## Task 8: Frontend — Register.tsx (show pending message)

**Files:**
- Modify: `apps/web/src/pages/auth/Register.tsx`

- [ ] **Step 1: Replace auto-login with pending message**

Currently the `onSubmit` function (lines 36–54) does:
```ts
toast.success('Rejestracja pomyślna. Możesz się teraz zalogować.');
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
navigate('/auth/login');
```

Replace with:
```ts
toast.success('Rejestracja przyjęta. Konto zostanie aktywowane po weryfikacji przez administratora.');
navigate('/auth/login');
```

Remove the push notification permission request (not relevant before approval).

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/auth/Register.tsx
git commit -m "feat: show admin-pending message after registration instead of auto-login"
```

---

## Task 9: Frontend — Login.tsx (mustChangePassword redirect)

**Files:**
- Modify: `apps/web/src/pages/auth/Login.tsx`

- [ ] **Step 1: Add mustChangePassword redirect**

In `onSubmit` (lines 28–44), after `setUser(res.data.user)` and before `toast.success(...)`, add the redirect check:

```ts
setAccessToken(res.data.accessToken);
setUser(res.data.user);

if (res.data.user?.mustChangePassword) {
  navigate('/user/zmien-haslo', { replace: true });
  return;
}

toast.success('Zalogowano pomyślnie.');
if (isSupported && permission !== 'denied') {
  setTimeout(() => subscribe(), 1000);
}
navigate(from, { replace: true });
```

The 403 error case (PENDING/REJECTED user) is already handled by the existing `catch` block which shows `e.response?.data?.message` — the backend returns Polish messages.

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/auth/Login.tsx
git commit -m "feat: redirect to /user/zmien-haslo after login if mustChangePassword"
```

---

## Task 10: Frontend — ChangePassword page + UserLayout guard + router

**Files:**
- Create: `apps/web/src/pages/user/ChangePassword.tsx`
- Modify: `apps/web/src/components/layout/UserLayout.tsx`
- Modify: `apps/web/src/router.tsx`

- [ ] **Step 1: Create ChangePassword.tsx page**

Create `apps/web/src/pages/user/ChangePassword.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/api/users.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, user } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    try {
      setLoading(true);
      const updatedUser = await usersApi.changePassword({ currentPassword, newPassword });
      setUser({ ...user!, ...updatedUser });
      toast.success('Hasło zostało zmienione');
      navigate('/user/wizyty', { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Błąd zmiany hasła');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-heading text-primary font-bold">
            Zmień hasło
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Ze względów bezpieczeństwa musisz ustawić nowe hasło przed korzystaniem z aplikacji.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Obecne hasło"
              className="bg-muted/50 py-6"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Nowe hasło (min. 8 znaków)"
              className="bg-muted/50 py-6"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Powtórz nowe hasło"
              className="bg-muted/50 py-6"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full py-6 text-base font-semibold" disabled={loading}>
              {loading ? 'Zapisywanie...' : 'Zmień hasło'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Add mustChangePassword guard to UserLayout.tsx**

In `apps/web/src/components/layout/UserLayout.tsx`, after the existing guards (around line 158–159):

```tsx
if (isLoading) return <div className="p-8 text-center">Ładowanie...</div>;
if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
```

Add two more guards immediately after:

```tsx
// Force password change for admin-created accounts
if (user?.mustChangePassword && location.pathname !== '/user/zmien-haslo') {
  return <Navigate to="/user/zmien-haslo" replace />;
}
// Prevent accessing change-password page when not needed
if (!user?.mustChangePassword && location.pathname === '/user/zmien-haslo') {
  return <Navigate to="/user/wizyty" replace />;
}
```

- [ ] **Step 3: Add route to router.tsx**

In `apps/web/src/router.tsx`, add the import:
```ts
import { ChangePassword } from './pages/user/ChangePassword';
```

In the `/user` path children array (around line 95–108), add:
```ts
{ path: 'zmien-haslo', element: <ChangePassword /> },
```

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/ChangePassword.tsx apps/web/src/components/layout/UserLayout.tsx apps/web/src/router.tsx
git commit -m "feat: add ChangePassword page with mustChangePassword guard in UserLayout"
```

---

## Task 11: Frontend — admin/Users.tsx (Oczekujące tab + Utwórz konto modal)

**Files:**
- Modify: `apps/web/src/pages/admin/Users.tsx`

- [ ] **Step 1: Filter getAllUsers to ACTIVE only**

In `apps/server/src/modules/users/users.service.ts`, in the `getAllUsers` function (line 35), add a `where` filter so the existing "Aktywni" tab doesn't mix PENDING/REJECTED accounts:

```ts
export const getAllUsers = async () => {
  return prisma.user.findMany({
    where: { accountStatus: 'ACTIVE' },   // ADD THIS
    select: { /* existing select unchanged */ },
  });
};
```

- [ ] **Step 2: Add state and queries for the new tab and modal**

At the top of the `Users` default export component function, add the new state and queries. Find where the existing component starts and add after the existing `useQuery` calls:

```tsx
const [activeTab, setActiveTab] = useState<'aktywni' | 'oczekujace'>('aktywni');
const [createModalOpen, setCreateModalOpen] = useState(false);
const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '' });
const [creating, setCreating] = useState(false);

const { data: pendingUsers = [], refetch: refetchPending } = useQuery({
  queryKey: ['admin', 'pending-users'],
  queryFn: usersApi.getPendingUsers,
});

const approveMutation = useMutation({
  mutationFn: (id: string) => usersApi.approveUser(id),
  onSuccess: () => { refetchPending(); toast.success('Konto zatwierdzone'); },
  onError: (e: any) => toast.error(e.response?.data?.message || 'Błąd'),
});

const rejectMutation = useMutation({
  mutationFn: (id: string) => usersApi.rejectUser(id),
  onSuccess: () => { refetchPending(); toast.success('Konto odrzucone'); },
  onError: (e: any) => toast.error(e.response?.data?.message || 'Błąd'),
});

const handleAdminCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setCreating(true);
    await authApi.adminCreateUser(createForm);
    toast.success('Konto utworzone. Przekaż hasło tymczasowe użytkownikowi.');
    setCreateModalOpen(false);
    setCreateForm({ name: '', email: '', phone: '', password: '' });
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Błąd tworzenia konta');
  } finally {
    setCreating(false);
  }
};
```

Add `import { authApi } from '@/api/auth.api';` to the imports at the top.

- [ ] **Step 2: Add tab bar + Utwórz konto button to the JSX**

Find the existing search/filter bar area in the `Users.tsx` JSX (likely near the top of the return). Add the tab bar and the button. The exact location depends on the file structure — add it before the user list section:

```tsx
{/* Tab bar */}
<div className="flex items-center justify-between mb-4">
  <div className="flex gap-2">
    <button
      onClick={() => setActiveTab('aktywni')}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === 'aktywni'
          ? 'bg-primary text-white'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      Aktywni
    </button>
    <button
      onClick={() => setActiveTab('oczekujace')}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        activeTab === 'oczekujace'
          ? 'bg-primary text-white'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      Oczekujące
      {pendingUsers.length > 0 && (
        <span className="bg-destructive text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
          {pendingUsers.length}
        </span>
      )}
    </button>
  </div>
  <Button size="sm" onClick={() => setCreateModalOpen(true)}>
    + Utwórz konto
  </Button>
</div>
```

- [ ] **Step 3: Add Oczekujące tab content**

Wrap the existing user list in `{activeTab === 'aktywni' && ( ... )}` and add the pending tab:

```tsx
{activeTab === 'oczekujace' && (
  <div className="space-y-2">
    {pendingUsers.length === 0 && (
      <p className="text-center text-muted-foreground py-8">Brak oczekujących kont</p>
    )}
    {pendingUsers.map(user => (
      <Card key={user.id}>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
            <p className="text-xs text-muted-foreground">Zarejestrowano: {formatDate(user.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => approveMutation.mutate(user.id)}
              disabled={approveMutation.isPending}
            >
              Zatwierdź
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50"
              onClick={() => rejectMutation.mutate(user.id)}
              disabled={rejectMutation.isPending}
            >
              Odrzuć
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}
```

- [ ] **Step 4: Add Utwórz konto modal**

At the bottom of the component JSX (before the closing `</div>`), add:

```tsx
{/* Utwórz konto modal */}
{createModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <h2 className="text-xl font-bold mb-4">Utwórz konto</h2>
        <form onSubmit={handleAdminCreate} className="space-y-3">
          <Input
            placeholder="Imię i nazwisko"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={createForm.email}
            onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            type="tel"
            placeholder="Telefon (opcjonalnie)"
            value={createForm.phone}
            onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
          />
          <Input
            type="password"
            placeholder="Hasło tymczasowe"
            value={createForm.password}
            onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
            required
          />
          <p className="text-xs text-muted-foreground">
            Użytkownik będzie musiał zmienić hasło przy pierwszym logowaniu.
          </p>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={creating} className="flex-1">
              {creating ? 'Tworzenie...' : 'Utwórz konto'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Anuluj
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/admin/Users.tsx
git commit -m "feat: add Oczekujące tab and Utwórz konto modal to admin Users page"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Start dev environment**

```bash
cd cosmo-app
pnpm dev
```

Expected: frontend on :5173, backend on :3001

- [ ] **Step 2: Test self-registration flow**

1. Go to `/auth/register`, fill the form, submit
2. Expected: toast "Rejestracja przyjęta. Konto zostanie aktywowane po weryfikacji przez administratora."
3. Try to log in with the registered credentials
4. Expected: error toast "Konto oczekuje na zatwierdzenie przez administratora"

- [ ] **Step 3: Test admin approval flow**

1. Log in as admin
2. Go to `/admin/uzytkownicy`, click "Oczekujące" tab
3. The registered user should appear
4. Click "Zatwierdź"
5. Expected: toast "Konto zatwierdzone", row disappears
6. Log in as the approved user
7. Expected: normal login, redirect to dashboard

- [ ] **Step 4: Test admin-create flow**

1. As admin on `/admin/uzytkownicy`, click "Utwórz konto"
2. Fill the form with name, email, temp password, submit
3. Expected: toast "Konto utworzone"
4. Log in with those credentials
5. Expected: redirect to `/user/zmien-haslo`
6. Fill in current (temp) password + new password, submit
7. Expected: redirect to `/user/wizyty`, can use app normally

- [ ] **Step 5: Run backend unit tests**

```bash
cd cosmo-app/apps/server
pnpm test
```

Expected: all tests pass

- [ ] **Step 6: Final commit**

```bash
cd cosmo-app
git add -A
git commit -m "chore: final cleanup after admin-approval registration feature"
```
