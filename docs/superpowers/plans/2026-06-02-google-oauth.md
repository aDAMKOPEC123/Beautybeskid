# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Zaloguj z Google" button to Login and Register pages using Google Identity Services frontend-first flow (no redirects).

**Architecture:** Frontend uses `@react-oauth/google` `<GoogleLogin>` component to get an `id_token` credential, sends it to `POST /api/auth/google`, backend verifies with `google-auth-library`, then finds/creates/merges user and returns identical JWT structure as regular login. Zustand auth store requires zero changes.

**Tech Stack:** `google-auth-library` (backend), `@react-oauth/google` (frontend), Prisma migration, Vitest (unit tests)

**Spec:** `docs/superpowers/specs/2026-06-02-google-oauth-design.md`

---

## File Map

**Create:**
- `apps/server/src/modules/auth/google.strategy.ts` — verifies Google id_token via OAuth2Client, returns `{ googleId, email, name, picture }`

**Modify:**
- `apps/server/prisma/schema.prisma:123` — `passwordHash String` → `String?`; add `googleId String? @unique`
- `apps/server/src/config/env.ts` — add `GOOGLE_CLIENT_ID` to Zod schema
- `apps/server/.env` — add `GOOGLE_CLIENT_ID` placeholder
- `apps/server/src/modules/auth/auth.service.ts` — add `loginWithGoogle()`, fix `loginUser` for null passwordHash
- `apps/server/src/modules/auth/auth.controller.ts` — add `googleAuth` handler
- `apps/server/src/modules/auth/auth.router.ts` — add `POST /google` route
- `apps/web/.env` — add `VITE_GOOGLE_CLIENT_ID` placeholder
- `apps/web/src/App.tsx` — wrap with `GoogleOAuthProvider`
- `apps/web/src/api/auth.api.ts` — add `loginWithGoogle(credential)`
- `apps/web/src/pages/auth/Login.tsx` — add `<GoogleAuthButton />`
- `apps/web/src/pages/auth/Register.tsx` — add `<GoogleAuthButton />`

**Create (frontend):**
- `apps/web/src/components/auth/GoogleAuthButton.tsx` — Google login button component

---

## Task 1: Install packages

**Files:** `apps/server/package.json`, `apps/web/package.json`

- [ ] **Install backend package**

```bash
cd /path/to/cosmo-app/apps/server && pnpm add google-auth-library
```

- [ ] **Install frontend package**

```bash
cd /path/to/cosmo-app/apps/web && pnpm add @react-oauth/google
```

- [ ] **Verify packages installed**

```bash
grep "google-auth-library" apps/server/package.json && grep "@react-oauth/google" apps/web/package.json
```
Expected: both lines appear in respective package.json files

---

## Task 2: Prisma schema + migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma:123-124`

- [ ] **Update schema — make passwordHash nullable and add googleId**

In `apps/server/prisma/schema.prisma`, find the User model (around line 120) and make two changes:

Change line 123:
```prisma
passwordHash   String
```
to:
```prisma
passwordHash   String?
googleId       String?  @unique
```

- [ ] **Run migration**

```bash
cd /path/to/cosmo-app/apps/server && npx prisma migrate dev --name add_google_id_to_user
```
Expected: migration created and applied, `✓ Generated Prisma Client`

- [ ] **Verify schema applied**

```bash
npx prisma studio
```
Check that User table has `googleId` column and `passwordHash` is nullable. Then close studio.

- [ ] **Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat: add googleId to User model, make passwordHash nullable"
```

---

## Task 3: Backend env var

**Files:**
- Modify: `apps/server/src/config/env.ts`
- Modify: `apps/server/.env`

- [ ] **Add GOOGLE_CLIENT_ID to Zod schema**

In `apps/server/src/config/env.ts`, add inside the `z.object({...})`:

```ts
GOOGLE_CLIENT_ID: z.string().min(10),
```

Place it after the SMTP vars block.

- [ ] **Add placeholder to .env**

In `apps/server/.env`, add:

```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> ⚠️ Replace with real Client ID from Google Cloud Console before testing. See Google Cloud Console setup section at end of this plan.

- [ ] **Verify TypeScript still compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: no errors (or only pre-existing errors unrelated to auth)

- [ ] **Commit**

```bash
git add apps/server/src/config/env.ts apps/server/.env
git commit -m "feat: add GOOGLE_CLIENT_ID env var to server config"
```

---

## Task 4: Backend — google.strategy.ts

**Files:**
- Create: `apps/server/src/modules/auth/google.strategy.ts`

- [ ] **Write test first**

Create `apps/server/src/modules/auth/google.strategy.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock google-auth-library before importing the strategy
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleToken } from './google.strategy';

describe('verifyGoogleToken', () => {
  let mockVerifyIdToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVerifyIdToken = vi.fn();
    (OAuth2Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));
  });

  it('returns parsed payload on valid token', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      }),
    });

    const result = await verifyGoogleToken('valid-credential');

    expect(result).toEqual({
      googleId: 'google-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
    });
  });

  it('throws when payload is missing', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => null });
    await expect(verifyGoogleToken('bad-credential')).rejects.toThrow('Nieprawidłowy token Google');
  });

  it('throws when email is missing from payload', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: '123', name: 'Test' }),
    });
    await expect(verifyGoogleToken('no-email-credential')).rejects.toThrow('Nieprawidłowy token Google');
  });
});
```

- [ ] **Run test to verify it fails**

```bash
cd /path/to/cosmo-app/apps/server && npx vitest run src/modules/auth/google.strategy.test.ts
```
Expected: FAIL — `verifyGoogleToken` not found

- [ ] **Create google.strategy.ts**

```ts
// filepath: apps/server/src/modules/auth/google.strategy.ts
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../middleware/error.middleware';
import { env } from '../../config/env';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GooglePayload {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export const verifyGoogleToken = async (credential: string): Promise<GooglePayload> => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new AppError('Nieprawidłowy token Google', 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
};
```

- [ ] **Run test to verify it passes**

```bash
cd /path/to/cosmo-app/apps/server && npx vitest run src/modules/auth/google.strategy.test.ts
```
Expected: 3 tests PASS

- [ ] **Commit**

```bash
git add apps/server/src/modules/auth/google.strategy.ts apps/server/src/modules/auth/google.strategy.test.ts
git commit -m "feat: add google token verification strategy"
```

---

## Task 5: Backend — loginWithGoogle service + loginUser guard

**Files:**
- Modify: `apps/server/src/modules/auth/auth.service.ts`

- [ ] **Fix loginUser for null passwordHash**

In `auth.service.ts`, find `loginUser` (line ~85). Change:

```ts
if (!raw || !(await bcrypt.compare(data.password, raw.passwordHash))) {
  throw new AppError('Nieprawidłowy email lub hasło', 401);
}
```

to:

```ts
if (!raw) {
  throw new AppError('Nieprawidłowy email lub hasło', 401);
}
if (!raw.passwordHash) {
  throw new AppError('To konto używa logowania przez Google. Zaloguj się przyciskiem "Zaloguj z Google".', 401);
}
if (!(await bcrypt.compare(data.password, raw.passwordHash))) {
  throw new AppError('Nieprawidłowy email lub hasło', 401);
}
```

- [ ] **Add loginWithGoogle function**

At the end of `auth.service.ts`, add:

```ts
export const loginWithGoogle = async (credential: string) => {
  const { googleId, email, name, picture } = await verifyGoogleToken(credential);

  // Generate unique ambassador code (shared helper logic)
  const generateAmbassadorCode = async (): Promise<string> => {
    while (true) {
      const code = generateCode(8);
      const existing = await prisma.user.findUnique({ where: { ambassadorCode: code } });
      if (!existing) return code;
    }
  };

  // Find by googleId first, then by email (merge case)
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Merge: link Google to existing account and activate if pending
    if (!user.googleId || user.accountStatus === 'PENDING') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          accountStatus: 'ACTIVE',
        },
      });
    }
  } else {
    // New user — create with ACTIVE status immediately
    const ambassadorCode = await generateAmbassadorCode();
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: null,
        googleId,
        avatarPath: picture ?? null,
        accountStatus: 'ACTIVE',
        ambassadorCode,
        // termsAcceptedAt auto-set: Google verifies identity
        termsAcceptedAt: new Date(),
        marketingConsent: false,
        photoConsent: false,
      },
    });
  }

  const fullUser = await getUserById(user.id);
  const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const refreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);

  return {
    user: {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
      avatarPath: fullUser.avatarPath,
      loyaltyPoints: fullUser.loyaltyPoints,
      loyaltyTier: fullUser.loyaltyTier,
      ambassadorCode: fullUser.ambassadorCode,
      referralCount: fullUser.referralCount,
      mustChangePassword: fullUser.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
};
```

- [ ] **Add missing import at top of auth.service.ts**

Add `import { verifyGoogleToken } from './google.strategy';` to the imports block at the top of `auth.service.ts`.

- [ ] **Verify TypeScript compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Commit**

```bash
git add apps/server/src/modules/auth/auth.service.ts
git commit -m "feat: add loginWithGoogle service, guard loginUser against null passwordHash"
```

---

## Task 6: Backend — controller + router

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts`
- Modify: `apps/server/src/modules/auth/auth.router.ts`

- [ ] **Add googleAuth controller**

> Note: `auth.controller.ts` uses `import * as authService from './auth.service'` (namespace import), so `authService.loginWithGoogle` is automatically available after Task 5 — no import change needed in the controller.

In `auth.controller.ts`, add at the end of the file:

```ts
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      throw new AppError('Brak tokenu Google', 400);
    }

    const result = await authService.loginWithGoogle(credential);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Add route to router**

In `auth.router.ts`, add after the existing routes:

```ts
router.post('/google', authController.googleAuth);
```

- [ ] **Verify TypeScript compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts apps/server/src/modules/auth/auth.router.ts
git commit -m "feat: add POST /auth/google endpoint"
```

---

## Task 7: Frontend env + GoogleOAuthProvider

**Files:**
- Modify: `apps/web/.env`
- Modify: `apps/web/src/App.tsx`

- [ ] **Add VITE_GOOGLE_CLIENT_ID to frontend .env**

In `apps/web/.env`, add:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> ⚠️ Replace with real Client ID from Google Cloud Console before testing.

- [ ] **Wrap App with GoogleOAuthProvider**

In `apps/web/src/App.tsx`, add import at top:

```ts
import { GoogleOAuthProvider } from '@react-oauth/google';
```

Wrap the return JSX — change:

```tsx
return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </HelmetProvider>
);
```

to:

```tsx
return (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </HelmetProvider>
  </GoogleOAuthProvider>
);
```

- [ ] **Verify TypeScript compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/web/.env apps/web/src/App.tsx
git commit -m "feat: add GoogleOAuthProvider to app root"
```

---

## Task 8: Frontend — auth API + GoogleAuthButton component

**Files:**
- Modify: `apps/web/src/api/auth.api.ts`
- Create: `apps/web/src/components/auth/GoogleAuthButton.tsx`

- [ ] **Add loginWithGoogle to auth.api.ts**

Open `apps/web/src/api/auth.api.ts`. Find the exported `authApi` object and add:

```ts
loginWithGoogle: (credential: string) =>
  api.post('/auth/google', { credential }).then((r) => r.data.data),
```

> Note: `.then(r => r.data.data)` is correct — the controller wraps the response as `{ status, data: { user, accessToken } }`, so `.data.data` unwraps to `{ user, accessToken }`. The spec file says `.data` (one level) — that is a spec error, follow the plan version here.

- [ ] **Create GoogleAuthButton component**

Create `apps/web/src/components/auth/GoogleAuthButton.tsx`:

```tsx
// filepath: apps/web/src/components/auth/GoogleAuthButton.tsx
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export const GoogleAuthButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setAccessToken } = useAuthStore();
  const from = (location.state as { from?: string } | null)?.from ?? '/user';

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error('Nie udało się zalogować przez Google');
      return;
    }
    try {
      const data = await authApi.loginWithGoogle(credentialResponse.credential);
      setUser(data.user);
      setAccessToken(data.accessToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Błąd logowania przez Google';
      toast.error(message);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => toast.error('Logowanie przez Google nie powiodło się')}
      useOneTap={false}
      width="100%"
      text="continue_with"
      locale="pl"
    />
  );
};
```

- [ ] **Verify TypeScript compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1
```
Expected: no errors

- [ ] **Commit**

```bash
git add apps/web/src/api/auth.api.ts apps/web/src/components/auth/GoogleAuthButton.tsx
git commit -m "feat: add GoogleAuthButton component and loginWithGoogle API call"
```

---

## Task 9: Add button to Login and Register pages

**Files:**
- Modify: `apps/web/src/pages/auth/Login.tsx`
- Modify: `apps/web/src/pages/auth/Register.tsx`

> Note on avatarPath: Google users get `avatarPath` set to a Google-hosted URL (e.g. `https://lh3.googleusercontent.com/...`). In this codebase, `avatarPath` is always used directly as `src={avatarPath}` — no `/uploads/` prefix is prepended anywhere. Google URLs work as-is. No frontend changes needed for avatar rendering.

- [ ] **Add GoogleAuthButton to Login.tsx**

Open `apps/web/src/pages/auth/Login.tsx`. Add import at top:

```ts
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
```

Find the submit button (or the bottom of the form). After the `<form>` closing tag and before the CardFooter (or equivalent), add a separator + button:

```tsx
{/* Google OAuth */}
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-background px-2 text-muted-foreground">lub</span>
  </div>
</div>
<GoogleAuthButton />
```

Place this block inside the `<CardContent>` but outside the `<form>`, between the form and the CardFooter.

- [ ] **Add GoogleAuthButton to Register.tsx**

Open `apps/web/src/pages/auth/Register.tsx`. Add the same import:

```ts
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
```

Add the same separator block in the same position (after `</form>`, before CardFooter).

- [ ] **Verify TypeScript compiles**

```bash
cd /path/to/cosmo-app && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1
```
Expected: no errors

- [ ] **Run all backend tests to confirm nothing broken**

```bash
cd /path/to/cosmo-app/apps/server && pnpm test 2>&1 | tail -10
```
Expected: all previously passing tests still pass (61 tests pass)

- [ ] **Commit**

```bash
git add apps/web/src/pages/auth/Login.tsx apps/web/src/pages/auth/Register.tsx
git commit -m "feat: add Google login button to Login and Register pages"
```

---

## Google Cloud Console Setup (jednorazowo, przed testem)

Wykonaj poniższe kroki zanim uruchomisz aplikację z Google OAuth:

1. Wejdź na [console.cloud.google.com](https://console.cloud.google.com)
2. Utwórz nowy projekt (np. "Cosmo Salon")
3. Przejdź do **APIs & Services → Credentials**
4. Kliknij **+ Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://twojadomena.pl` (po wdrożeniu)
7. **Nie dodawaj** Authorized redirect URIs (flow nie używa redirectów)
8. Skopiuj **Client ID** (format: `xxx.apps.googleusercontent.com`)
9. Wklej go do:
   - `apps/server/.env` → `GOOGLE_CLIENT_ID=...`
   - `apps/web/.env` → `VITE_GOOGLE_CLIENT_ID=...`
10. Zrestartuj serwer dev (`pnpm dev`)

---

## Weryfikacja end-to-end

Po skonfigurowaniu Google Client ID:

- [ ] Uruchom `pnpm dev` w `cosmo-app/`
- [ ] Wejdź na `http://localhost:5173/auth/login`
- [ ] Powinien pojawić się przycisk "Kontynuuj z Google" pod formularzem
- [ ] Kliknij, wybierz konto Google — powinieneś zostać zalogowany i przekierowany na `/user`
- [ ] Sprawdź w Prisma Studio / PostgreSQL czy user ma `googleId` ustawiony i `accountStatus: ACTIVE`
- [ ] Sprawdź `http://localhost:5173/auth/register` — przycisk Google również dostępny
