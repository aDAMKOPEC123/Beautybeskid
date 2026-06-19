# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 security vulnerabilities identified in audit: stolen refresh tokens, unprotected private uploads, missing rate limits, in-memory rate limiter, lax authorization pattern, and unsanitized HTML.

**Architecture:** Minimal targeted fixes — each task touches only what's needed. No refactors beyond scope. Schema migration for refresh tokens, new auth middleware for private file serving, swap custom rate limiter for battle-tested library, server-side HTML sanitization.

**Tech Stack:** Express 5, Prisma 5, TypeScript, Vitest, `express-rate-limit`, `sanitize-html`

---

## File Map

| File | Action | Why |
|------|--------|-----|
| `apps/server/src/modules/auth/auth.router.ts` | Modify | Add rate limiter to `/refresh` and `/google` |
| `apps/server/src/modules/users/users.router.ts` | Modify | Add rate limiter to `/me/change-password`, move card auth to middleware |
| `apps/server/src/middleware/rateLimit.middleware.ts` | Replace | Swap custom in-memory impl for `express-rate-limit` |
| `apps/server/prisma/schema.prisma` | Modify | Add `RefreshToken` model |
| `apps/server/src/modules/auth/auth.controller.ts` | Modify | Store/verify/delete refresh token in DB |
| `apps/server/src/middleware/privateUpload.middleware.ts` | Create | Auth-gated static file serving for sensitive folders |
| `apps/server/src/app.ts` | Modify | Replace `/uploads` static with private middleware for journal/appointments |
| `apps/server/src/modules/blog/blog.service.ts` | Modify | Sanitize `contentHtml` before DB write |
| `apps/server/package.json` | Modify | Add `express-rate-limit`, `sanitize-html`, `@types/sanitize-html` |

---

## Task 1: Rate Limiting Quick Wins

**Files:**
- Modify: `apps/server/src/modules/auth/auth.router.ts`
- Modify: `apps/server/src/modules/users/users.router.ts`

Three missing `authRateLimiter` calls — each is a single-line addition.

- [ ] **Step 1: Add `authRateLimiter` to `/refresh` and `/google` in auth.router.ts**

Open `apps/server/src/modules/auth/auth.router.ts`. Current lines 11–15:
```ts
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.post('/google', authController.googleAuth);
```

Change to:
```ts
router.post('/logout', authController.logout);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.post('/google', authRateLimiter, authController.googleAuth);
```

- [ ] **Step 2: Add `authRateLimiter` to `/me/change-password` in users.router.ts**

Open `apps/server/src/modules/users/users.router.ts`. Find line:
```ts
router.patch('/me/change-password', usersController.changePassword);
```
Change to:
```ts
router.patch('/me/change-password', authRateLimiter, usersController.changePassword);
```

Add import at top of file (after existing imports):
```ts
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
```

- [ ] **Step 3: Build check**

Run from `cosmo-app/apps/server/`:
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**
```bash
git add apps/server/src/modules/auth/auth.router.ts apps/server/src/modules/users/users.router.ts
git commit -m "security: add rate limiting to refresh, google auth, and change-password endpoints"
```

---

## Task 2: Swap Custom Rate Limiter for `express-rate-limit`

The custom in-memory `Map`-based limiter resets on every server restart and breaks under multiple processes. Replace with the industry-standard `express-rate-limit` library.

**Files:**
- Modify: `apps/server/package.json`
- Replace: `apps/server/src/middleware/rateLimit.middleware.ts`

- [ ] **Step 1: Install `express-rate-limit`**

Run from `cosmo-app/apps/server/`:
```bash
pnpm add express-rate-limit
```

- [ ] **Step 2: Replace `rateLimit.middleware.ts` entirely**

Replace the full contents of `apps/server/src/middleware/rateLimit.middleware.ts`:

```ts
import rateLimit from 'express-rate-limit';

const createLimiter = (max: number, windowMs: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message },
  });

export const authRateLimiter = createLimiter(
  10,
  60 * 1000,
  'Zbyt wiele prób, spróbuj ponownie za minutę'
);

export const apiRateLimiter = createLimiter(
  200,
  60 * 1000,
  'Zbyt wiele żądań, spróbuj ponownie później'
);
```

- [ ] **Step 3: Build check**
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**
```bash
git add apps/server/src/middleware/rateLimit.middleware.ts apps/server/package.json pnpm-lock.yaml
git commit -m "security: replace custom in-memory rate limiter with express-rate-limit"
```

---

## Task 3: Refresh Token Persistence (Logout Invalidation)

Currently logout only clears the browser cookie. A stolen refresh token stays valid for 7 days. Fix: store a hashed refresh token in the DB, verify on refresh, delete on logout.

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Modify: `apps/server/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Add `RefreshToken` model to schema.prisma**

In `apps/server/prisma/schema.prisma`, add after the `User` model (after line 193):

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

Also add to the `User` model (after the last relation line, before the closing `}`):
```prisma
  refreshTokens RefreshToken[]
```

- [ ] **Step 2: Run migration**

From `cosmo-app/apps/server/`:
```bash
pnpm prisma:migrate
```
When prompted for migration name, type: `add_refresh_token_table`

Expected: migration created and applied, `pnpm prisma:generate` runs automatically.

- [ ] **Step 3: Update `login` — store hashed refresh token after issuing it**

In `apps/server/src/modules/auth/auth.controller.ts`, find the `login` function. After `res.cookie('refreshToken', result.refreshToken, {...})` and before `res.status(200).json(...)`, add:

```ts
// Store hashed refresh token in DB
// NOTE: crypto is already statically imported at top of this file — do NOT use await import()
const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
await prisma.refreshToken.create({
  data: {
    tokenHash,
    userId: result.user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7d — matches JWT_REFRESH_EXPIRES_IN
  },
});
```

Note: `crypto` is already statically imported at the top of auth.controller.ts (`import crypto from 'crypto'`). Use it directly — no `await import()`. `prisma` is also already imported.

Do the same for the `googleAuth` function — same pattern after `res.cookie(...)`.

- [ ] **Step 4: Update `refresh` — verify token exists in DB**

In `auth.controller.ts`, find the `refresh` function. Current code:
```ts
const refreshToken = req.cookies.refreshToken;
if (!refreshToken) throw new AppError('Brak tokenu odświeżania', 401);

const decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET) as { id: string; iat?: number };
const user = await prisma.user.findUnique({ where: { id: decoded.id } });
```

After `const decoded = ...` line, add:
```ts
// Verify token exists in DB (not revoked)
const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
if (!storedToken || storedToken.expiresAt < new Date()) {
  throw new AppError('Token odświeżania wygasł lub został unieważniony', 401);
}
```

Then after `const accessToken = signToken(...)` (line 93 of auth.controller.ts) and before `res.status(200).json(...)`, rotate the refresh token (delete old, issue new):

```ts
// Rotate: delete old token from DB, generate and store new one
await prisma.refreshToken.delete({ where: { tokenHash } });
const newRefreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
await prisma.refreshToken.create({
  data: {
    tokenHash: newTokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7d — matches JWT_REFRESH_EXPIRES_IN
  },
});
res.cookie('refreshToken', newRefreshToken, {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
});
```

Note: The `refresh` function does NOT call `authService` — it generates the access token inline with `signToken`. `signToken` is already imported at line 6 of auth.controller.ts. `env` is already imported. The variable `user` is already declared above this block.

- [ ] **Step 5: Update `logout` — delete token from DB**

In the `logout` function, replace:
```ts
res.clearCookie('refreshToken');
res.status(200).json({ status: 'success', message: 'Wylogowano pomyślnie' });
```

With:
```ts
const refreshToken = req.cookies?.refreshToken;
if (refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}
res.clearCookie('refreshToken');
res.status(200).json({ status: 'success', message: 'Wylogowano pomyślnie' });
```

Note: `logout` is already `async` — no signature change needed.

- [ ] **Step 6: Build check**
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 7: Smoke test — manual flow**

Start the server (`pnpm dev` from `cosmo-app/`), then:
1. `POST /api/auth/login` — verify token cookie is set
2. `POST /api/auth/refresh` — verify new access token returned
3. `POST /api/auth/logout` — verify cookie cleared
4. `POST /api/auth/refresh` again with old cookie — should get 401

- [ ] **Step 8: Commit**
```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/ apps/server/src/modules/auth/auth.controller.ts
git commit -m "security: persist refresh tokens in DB to enable invalidation on logout"
```

---

## Task 4: Private Uploads — Auth-Gated File Serving

`/uploads/journal/*` and `/uploads/appointments/*` currently served publicly. Add auth + ownership check for these folders.

**Files:**
- Create: `apps/server/src/middleware/privateUpload.middleware.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create `privateUpload.middleware.ts`**

Create `apps/server/src/middleware/privateUpload.middleware.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

// Folders that require authentication + ownership check
const PRIVATE_FOLDERS = ['journal', 'appointments'];

export const privateUploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract folder from path: /uploads/journal/uuid.webp -> 'journal'
  const urlPath = req.path; // e.g. /journal/abc.webp
  const folder = urlPath.split('/')[1];

  if (!PRIVATE_FOLDERS.includes(folder)) {
    // Not a private folder — pass through to express.static
    return next();
  }

  // Require auth
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Brak autoryzacji' });
    return;
  }

  let decoded: { id: string; role: string };
  try {
    decoded = verifyToken(token, env.JWT_SECRET) as { id: string; role: string };
  } catch {
    res.status(401).json({ status: 'error', message: 'Nieprawidłowy token' });
    return;
  }

  // Admins and employees can access all files
  if (decoded.role === 'ADMIN' || decoded.role === 'EMPLOYEE') {
    return next();
  }

  // Regular users: verify ownership
  const filename = path.basename(urlPath);

  if (folder === 'journal') {
    const entry = await prisma.skinJournalEntry.findFirst({
      where: { photoPath: { endsWith: filename }, userId: decoded.id },
    });
    if (!entry) {
      res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
      return;
    }
  } else if (folder === 'appointments') {
    const appointment = await prisma.appointment.findFirst({
      where: { photoPath: { endsWith: filename }, userId: decoded.id },
    });
    if (!appointment) {
      res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
      return;
    }
  }

  next();
};
```

- [ ] **Step 2: Modify `app.ts` — use middleware before express.static**

In `apps/server/src/app.ts`, find:
```ts
app.use('/uploads', express.static('uploads'));
```

Replace with:
```ts
import { privateUploadMiddleware } from './middleware/privateUpload.middleware';

// ...

app.use('/uploads', privateUploadMiddleware, express.static('uploads'));
```

(Add the import with the other imports at the top of the file.)

- [ ] **Step 3: Build check**
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Smoke test**

1. Try `GET /uploads/journal/anyfile.webp` without Authorization header — expect 401
2. Try with a valid user JWT — expect file served (or 404 if file doesn't exist)
3. Try `GET /uploads/avatars/anyfile.webp` without auth — expect file served normally (public folder)

- [ ] **Step 5: Commit**
```bash
git add apps/server/src/middleware/privateUpload.middleware.ts apps/server/src/app.ts
git commit -m "security: add auth-gated middleware for private upload folders (journal, appointments)"
```

---

## Task 5: Blog HTML Server-Side Sanitization

TipTap generates HTML stored as-is in the DB. If the admin panel is compromised, malicious HTML can be injected. Sanitize before saving.

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/server/src/modules/blog/blog.service.ts`

- [ ] **Step 1: Install `sanitize-html`**

From `cosmo-app/apps/server/`:
```bash
pnpm add sanitize-html
pnpm add -D @types/sanitize-html
```

- [ ] **Step 2: Find where blog `contentHtml` is written in `blog.service.ts`**

Open `apps/server/src/modules/blog/blog.service.ts`. Look for `createPost` and `updatePost` functions. They receive `contentHtml` from validated data and pass it to `prisma.blogPost.create/update`.

- [ ] **Step 3: Add sanitization to `blog.service.ts`**

Add import at top:
```ts
import sanitizeHtml from 'sanitize-html';
```

Add a sanitization config constant after the import:
```ts
const BLOG_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'figure', 'figcaption', 'h1', 'h2', 'iframe',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'class'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
    '*': ['class', 'style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(/],
    },
  },
};
```

In `createPost` and `updatePost` (wherever `contentHtml` is passed to Prisma), wrap it:
```ts
contentHtml: sanitizeHtml(data.contentHtml, BLOG_SANITIZE_OPTIONS),
```

- [ ] **Step 4: Build check**
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**
```bash
git add apps/server/src/modules/blog/blog.service.ts apps/server/package.json pnpm-lock.yaml
git commit -m "security: sanitize blog HTML content server-side before storing in DB"
```

---

## Task 6: Move Card Authorization to Middleware

`PATCH /users/:id/card` checks `role` inside the controller body instead of using `requireStaff` middleware. Move it to middleware for consistency and robustness.

**Files:**
- Modify: `apps/server/src/modules/users/users.router.ts`
- Modify: `apps/server/src/modules/users/users.controller.ts`

- [ ] **Step 1: Update import in users.router.ts**

Open `apps/server/src/modules/users/users.router.ts`. The file already imports `requireAdmin` from `admin.middleware`. Add `requireStaff` to the SAME import line (do not add a duplicate import):
```ts
// Before:
import { requireAdmin } from '../../middleware/admin.middleware';
// After:
import { requireAdmin, requireStaff } from '../../middleware/admin.middleware';
```

- [ ] **Step 2: Add `requireStaff` to the route in users.router.ts**

Find:
```ts
router.patch('/:id/card', usersController.updateUserCard);
```
Change to:
```ts
router.patch('/:id/card', requireStaff, usersController.updateUserCard);
```

- [ ] **Step 3: Remove the manual role check from `updateUserCard` in users.controller.ts**

In `apps/server/src/modules/users/users.controller.ts`, find `updateUserCard`. Remove lines:
```ts
if (req.user!.role !== 'ADMIN' && req.user!.role !== 'EMPLOYEE') {
  throw new AppError('Brak uprawnień', 403);
}
```
The middleware now handles this.

- [ ] **Step 4: Build check**
```bash
pnpm build
```
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**
```bash
git add apps/server/src/modules/users/users.router.ts apps/server/src/modules/users/users.controller.ts
git commit -m "security: move card update authorization from controller body to requireStaff middleware"
```

---

## Final Verification

- [ ] **Full build**
```bash
cd cosmo-app && pnpm build
```
Expected: all packages build cleanly.

- [ ] **Run tests**
```bash
cd cosmo-app/apps/server && pnpm test
```
Expected: all tests pass.

- [ ] **Security checklist**

| # | Fix | Verified |
|---|-----|---------|
| 1 | `/refresh` has `authRateLimiter` | [ ] |
| 2 | `/google` has `authRateLimiter` | [ ] |
| 3 | `/me/change-password` has `authRateLimiter` | [ ] |
| 4 | `rateLimit.middleware.ts` uses `express-rate-limit` | [ ] |
| 5 | `RefreshToken` table exists in DB | [ ] |
| 6 | Logout deletes token from DB | [ ] |
| 7 | `/uploads/journal/*` returns 401 without auth | [ ] |
| 8 | `/uploads/appointments/*` returns 401 without auth | [ ] |
| 9 | Blog HTML sanitized before save | [ ] |
| 10 | `PATCH /:id/card` uses `requireStaff` middleware | [ ] |
