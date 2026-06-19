# Admin-Approval Registration System — Design Spec

**Date:** 2026-04-08
**Project:** COSMO Beauty Salon Management App
**Status:** Approved

---

## Overview

Replace the current open registration flow (instant account activation) with an admin-approval model. New users who self-register must wait for an admin to approve their account before they can log in. Admins can also create accounts directly (instantly active, with forced password change on first login).

---

## Requirements Summary

- Self-registered users → `PENDING` status, cannot log in until approved
- Admin approves → `ACTIVE`, user receives email notification
- Admin rejects → `REJECTED`, user sees rejection message on login attempt
- Admin can create accounts directly → `ACTIVE` + `mustChangePassword: true`
- Admin receives in-app notification when a new registration arrives
- Admin UI: new "Oczekujące" tab on `/admin/uzytkownicy` + "Utwórz konto" button
- User forced to change password on first login if account was admin-created

---

## Database Changes

### New enum

```prisma
enum AccountStatus {
  PENDING
  ACTIVE
  REJECTED
}
```

### Changes to `User` model

```prisma
model User {
  // ...existing fields...
  accountStatus      AccountStatus @default(PENDING)
  mustChangePassword Boolean       @default(false)
}
```

### Migration strategy

Prisma generates the migration SQL. The developer must **edit the generated migration file** to add a backfill step before applying it. The correct three-step pattern:

```sql
-- Step 1: Add column with PENDING default (Prisma generates this)
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING';

-- Step 2: Backfill all existing users to ACTIVE (add this manually)
UPDATE "User" SET "accountStatus" = 'ACTIVE';

-- Step 3: Drop the column default so new rows must be explicit (optional, Prisma may omit)
-- Prisma model @default(PENDING) covers new inserts at application level
```

- `mustChangePassword` defaults to `false` — no backfill needed for existing users

---

## Shared Types (`packages/shared/`)

The `User` interface exported from `@cosmo/shared` must include the new fields so the frontend Zustand store and all consumers can reference them without TypeScript errors:

```ts
export interface User {
  // ...existing fields...
  accountStatus?: AccountStatus;
  mustChangePassword?: boolean;
}

export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}
```

`mustChangePassword` is returned in the login response payload so the frontend can redirect on first login.

---

## Backend Changes

### `apps/server/src/modules/auth/auth.service.ts`

**`registerUser`:**
- Create user with `accountStatus: 'PENDING'`
- After the `$transaction` completes, fire-and-forget: query all users with `role: 'ADMIN'` and create one `Notification` per admin in a **separate** operation outside the transaction. Use `title: "Nowa rejestracja"`, `body: "Nowa rejestracja: {name} ({email})"`, `type: GENERIC`. Both `title` and `body` are non-nullable on the `Notification` model. A failure here must not roll back user creation.
- Do NOT return tokens — registration no longer auto-logs in the user

**`loginUser`:**
- After password verification, check `accountStatus`:
  - `PENDING` → throw `AppError('Konto oczekuje na zatwierdzenie przez administratora', 403)`
  - `REJECTED` → throw `AppError('Konto zostało odrzucone. Skontaktuj się z salonem.', 403)`
  - `ACTIVE` → proceed normally
- Return `mustChangePassword` field alongside user data in the response. The existing `loginUser` return object is manually constructed — explicitly add `mustChangePassword: user.mustChangePassword` to the returned `user` object (after `getUserById` returns it from the select projection)

### `apps/server/src/modules/auth/auth.controller.ts`

**`refresh`:**
- After verifying the refresh token and fetching the user, add `accountStatus` check identical to `loginUser`:
  - `PENDING` → throw `AppError(403)`
  - `REJECTED` → throw `AppError(403)`
- This prevents blocked users from silently refreshing tokens and accessing protected endpoints.

### `apps/server/src/modules/auth/auth.service.ts` — new function `adminCreateUser`

Placed in `auth.service.ts` (not `users.service.ts`) because it owns credential creation (`bcrypt.hash`) consistent with `registerUser`:

```ts
adminCreateUser(data: { name, email, phone, password }) => User
```

- Validates email uniqueness
- Hashes password with `bcrypt.hash(password, 10)`
- Generates unique `ambassadorCode` (reuse existing `generateCode` utility)
- Creates user with `accountStatus: 'ACTIVE'`, `mustChangePassword: true`, `termsAcceptedAt: new Date()`
- Returns created user (no tokens)

### `apps/server/src/modules/users/users.router.ts`

New admin-only routes. **Order matters:** literal paths (`/pending`, `/admin-create`) must be registered **before** the `/:id` wildcard to prevent Express matching them as IDs:

```ts
// All below require authenticate + requireAdmin
router.get('/pending', requireAdmin, usersController.getPendingUsers);        // BEFORE /:id
router.post('/admin-create', requireAdmin, usersController.adminCreateUser);  // BEFORE /:id
router.post('/:id/approve', requireAdmin, usersController.approveUser);
router.post('/:id/reject', requireAdmin, usersController.rejectUser);
// ...existing /:id routes follow
```

The `adminCreateUser` handler lives in `users.controller.ts` as a thin wrapper that delegates to `authService.adminCreateUser`. This avoids a cross-module controller import (`authController` inside `users.router.ts` is non-standard). The service function remains in `auth.service.ts` to keep bcrypt ownership consistent.

### `apps/server/src/modules/users/users.service.ts`

**`getPendingUsers()`**
- Returns all users where `accountStatus: 'PENDING'`, ordered by `createdAt` asc
- Fields: `id, name, email, phone, createdAt`

**`approveUser(id: string)`**
- Fetch user, throw `AppError(404)` if not found
- Throw `AppError('Konto nie jest w statusie oczekującym', 400)` if `accountStatus !== 'PENDING'` — prevents double-click and accidental activation of already-active accounts
- Sets `accountStatus: 'ACTIVE'`
- Sends email via `sendEmail`: subject `"Konto zatwierdzone — COSMO"`, body informing the user they can now log in

**`rejectUser(id: string)`**
- Fetch user, throw `AppError(404)` if not found
- Throw `AppError('Konto nie jest w statusie oczekującym', 400)` if `accountStatus !== 'PENDING'` — prevents rejecting already-active accounts
- Sets `accountStatus: 'REJECTED'`

### New Zod schema for change-password

In `packages/shared/` (or locally in users module if not shared):

```ts
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
```

### `apps/server/src/modules/users/users.service.ts` — `getUserById` select

The existing `getUserById` `select` projection must include `mustChangePassword` so that `GET /api/users/me` returns it. Without this, the `UserLayout` freshUser sync (which calls `/users/me` on mount and merges the result into the Zustand store) will overwrite `mustChangePassword: true` with `undefined`, silently disabling the forced-password-change guard after the first request.

### New endpoint: `PATCH /api/users/me/change-password`

- Placed in `users.router.ts` (authenticated via existing `router.use(authenticate)`)
- Validates body against `changePasswordSchema`
- Fetches user, verifies `currentPassword` with `bcrypt.compare`
- Hashes new password, updates `passwordHash`, sets `mustChangePassword: false`
- Returns updated user object (including `mustChangePassword: false`) so the frontend can update store state

---

## Frontend Changes

### `apps/web/src/pages/auth/Register.tsx`

- After successful registration (`201`), instead of logging in:
  - Show success message: _"Rejestracja przyjęta. Konto zostanie aktywowane po weryfikacji przez administratora."_
  - No auto-login, no redirect

### `apps/web/src/pages/auth/Login.tsx`

- Handle `403` response: display the server error message directly (already in Polish)

### `apps/web/src/pages/auth/Login.tsx`

The post-login redirect logic belongs in `Login.tsx` (not in the Zustand store — the store has no navigation capability). After a successful login response:
- If `result.user.mustChangePassword === true` → `navigate('/user/zmien-haslo')`
- Otherwise → normal destination redirect

### `apps/web/src/store/auth.store.ts`

- No navigation logic is added to the store
- After successful `PATCH /api/users/me/change-password`, the response returns the full user object; call `setUser(updatedUser)` in the store to clear `mustChangePassword`. The `PATCH` endpoint returns all fields matching the `getUserById` select projection.

### New page: `apps/web/src/pages/user/ChangePassword.tsx`

- Route: `/user/zmien-haslo` (placed under `UserLayout` — inherits existing `isAuthenticated` guard)
- Additional guard in `UserLayout` or as a wrapper: if user is authenticated AND `mustChangePassword === true`, redirect to `/user/zmien-haslo` from any other `/user/*` route — preventing the user from bypassing the password change screen
- Conversely, if user is authenticated AND `mustChangePassword === false`, redirect away from `/user/zmien-haslo` to prevent re-access
- Form: current password + new password + confirm new password
- On success: update store, redirect to `/user/wizyty`

### `apps/web/src/pages/admin/Users.tsx`

**New "Oczekujące" tab:**
- Tab bar: `Aktywni` | `Oczekujące (N)` (badge with count)
- Pending tab table columns: Imię, Email, Telefon, Data rejestracji, Akcje
- Actions: "Zatwierdź" (green) + "Odrzuć" (red)
- On approve/reject: remove row from pending list optimistically

**New "Utwórz konto" button:**
- Opens a modal: Imię, Email, Telefon, Hasło tymczasowe
- On submit: calls `POST /api/users/admin-create` (via auth API)
- On success: show confirmation toast, close modal

### `apps/web/src/api/users.api.ts`

```ts
getPendingUsers()              → GET  /api/users/pending
approveUser(id)                → POST /api/users/:id/approve
rejectUser(id)                 → POST /api/users/:id/reject
changePassword(data)           → PATCH /api/users/me/change-password
```

### `apps/web/src/api/auth.api.ts`

```ts
adminCreateUser(data)          → POST /api/users/admin-create
```

---

## Data Flow

```
[User fills /register]
        ↓
  POST /api/auth/register
        ↓
  User created (PENDING)
  + Admin in-app notifications (fire-and-forget, outside transaction)
        ↓
  Frontend shows "Oczekuje na zatwierdzenie"

[Admin sees notification → opens /admin/uzytkownicy → Oczekujące tab]
        ↓
  Clicks "Zatwierdź"
        ↓
  POST /api/users/:id/approve  (validates status === PENDING)
        ↓
  accountStatus → ACTIVE
  + Email sent to user
        ↓
  User logs in normally
```

```
[Admin clicks "Utwórz konto"]
        ↓
  POST /api/users/admin-create (auth.service.adminCreateUser)
        ↓
  User created (ACTIVE, mustChangePassword: true)
        ↓
  Admin shares temp password with user

[User logs in with temp password]
        ↓
  mustChangePassword === true → redirect /user/zmien-haslo
  UserLayout guard prevents access to any other /user/* route
        ↓
  PATCH /api/users/me/change-password
        ↓
  mustChangePassword → false, store updated → redirect /user/wizyty
```

---

## Error Handling

| Scenario | HTTP | Message |
|---|---|---|
| Login, account PENDING | 403 | "Konto oczekuje na zatwierdzenie przez administratora" |
| Login, account REJECTED | 403 | "Konto zostało odrzucone. Skontaktuj się z salonem." |
| Refresh token, account PENDING/REJECTED | 403 | same as login |
| Admin creates account, email exists | 400 | "Użytkownik z tym adresem email już istnieje" |
| Approve/reject non-existent user | 404 | "Użytkownik nie istnieje" |
| Approve/reject user not in PENDING status | 400 | "Konto nie jest w statusie oczekującym" |
| Change password, wrong current password | 400 | "Nieprawidłowe obecne hasło" |

---

## Out of Scope

- Push notifications for account approval (user has no push subscription before first login — email is used instead)
- Email notification to admin on registration (in-app notification is sufficient per requirements)
- Re-activating a REJECTED account via UI (can be done via existing admin user management if needed)
- `NEW_REGISTRATION` notification type enum value — `GENERIC` is used for now; can be added later
