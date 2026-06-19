# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zastąpić ręczne zatwierdzanie kont przez admina automatyczną weryfikacją emaila przez Resend — po rejestracji użytkownik dostaje email z linkiem aktywacyjnym.

**Architecture:** Resend SDK zastępuje Nodemailer w `utils/email.ts` (ta sama sygnatura). Rejestracja zapisuje `emailVerificationToken` w DB w ramach transakcji i wysyła email. Nowy endpoint `GET /auth/verify-email?token=` aktywuje konto i robi redirect na frontend. Login rozróżnia "czeka na email" (PENDING + token) od "czeka na admina" (PENDING bez tokenu).

**Tech Stack:** `resend` (npm), Prisma migration, Vitest, React `useSearchParams`

**Spec:** `docs/superpowers/specs/2026-06-02-email-verification-design.md`

---

## File Map

**Modify:**
- `apps/server/prisma/schema.prisma` — dodać `emailVerificationToken String? @unique`
- `apps/server/src/config/env.ts` — usunąć SMTP vars, dodać `RESEND_API_KEY` i `RESEND_FROM`
- `apps/server/.env` — usunąć SMTP vars, dodać Resend vars
- `apps/server/src/utils/email.ts` — zastąpić Nodemailer → Resend SDK
- `apps/server/src/modules/auth/auth.service.ts` — `registerUser` (token + send), `loginUser` (PENDING guard), `loginWithGoogle` (clear stale token), nowa funkcja `verifyEmail`
- `apps/server/src/modules/auth/auth.controller.ts` — nowy handler `verifyEmail`
- `apps/server/src/modules/auth/auth.router.ts` — nowy route `GET /verify-email`
- `apps/web/src/pages/auth/Register.tsx` — po rejestracji pokazać komunikat zamiast redirect
- `apps/web/src/pages/auth/Login.tsx` — obsługa `?verified=true` i `?error=invalid-token`

---

## Task 1: Prisma schema + migracja

**Files:**
- Modify: `apps/server/prisma/schema.prisma:123`

- [ ] **Dodaj pole do modelu User**

W `apps/server/prisma/schema.prisma` w modelu `User`, po linii `googleId String? @unique` dodaj:

```prisma
emailVerificationToken  String?  @unique
```

- [ ] **Utwórz plik migracji ręcznie**

```bash
mkdir -p apps/server/prisma/migrations/20260602000001_add_email_verification_token
```

Utwórz plik `apps/server/prisma/migrations/20260602000001_add_email_verification_token/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
```

- [ ] **Zastosuj migrację i zregeneruj klienta**

```bash
cd apps/server && npx prisma migrate deploy && npx prisma generate
```
Expected: `All migrations have been successfully applied` + `✔ Generated Prisma Client`

- [ ] **Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/20260602000001_add_email_verification_token/
git commit -m "feat: add emailVerificationToken field to User"
```

---

## Task 2: Env vars — usunąć SMTP, dodać Resend

**Files:**
- Modify: `apps/server/src/config/env.ts`
- Modify: `apps/server/.env`

- [ ] **Zainstaluj pakiet Resend**

```bash
cd apps/server && pnpm add resend
```
Expected: `resend` pojawia się w `package.json`

- [ ] **Zaktualizuj env.ts**

W `apps/server/src/config/env.ts` usuń linie z SMTP i dodaj Resend:

Usuń:
```ts
SMTP_HOST: z.string().optional(),
SMTP_PORT: z.coerce.number().optional(),
SMTP_USER: z.string().optional(),
SMTP_PASS: z.string().optional(),
SMTP_FROM: z.string().optional(),
```

Dodaj w ich miejsce:
```ts
RESEND_API_KEY: z.string().min(1),
RESEND_FROM: z.string().email(),
```

- [ ] **Zaktualizuj .env**

W `apps/server/.env` usuń linie SMTP i dodaj:

```
RESEND_API_KEY=re_WqspLGF1_LDG65z9QZraew9GAY4iXQy4Y
RESEND_FROM=no-reply@twojadomena.pl
```

> ⚠️ `RESEND_FROM` musi być domeną zweryfikowaną w Resend Dashboard. Na potrzeby testów możesz użyć `onboarding@resend.dev` (działa bez weryfikacji domeny, wysyła tylko na swój własny adres).

- [ ] **Weryfikuj TypeScript backendu**

```bash
npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: brak nowych błędów

- [ ] **Commit**

```bash
git add apps/server/src/config/env.ts apps/server/.env apps/server/package.json
git commit -m "feat: replace SMTP env vars with Resend config"
```

---

## Task 3: Zastąp Nodemailer → Resend w email.ts

**Files:**
- Modify: `apps/server/src/utils/email.ts`

- [ ] **Nadpisz email.ts**

Zastąp całą zawartość pliku `apps/server/src/utils/email.ts`:

```ts
// filepath: apps/server/src/utils/email.ts
import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('[sendEmail] Resend error:', error);
    throw new Error(`Nie udało się wysłać emaila: ${error.message}`);
  }
};
```

- [ ] **Weryfikuj TypeScript backendu**

```bash
npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: brak błędów

- [ ] **Commit**

```bash
git add apps/server/src/utils/email.ts
git commit -m "feat: replace Nodemailer with Resend SDK in email utility"
```

---

## Task 4: auth.service.ts — token rejestracji + login guard + verifyEmail

**Files:**
- Modify: `apps/server/src/modules/auth/auth.service.ts`

- [ ] **Dodaj import crypto na górze auth.service.ts**

Na początku pliku `apps/server/src/modules/auth/auth.service.ts` dodaj:

```ts
import crypto from 'crypto';
import { sendEmail } from '../../utils/email';
```

- [ ] **Zaktualizuj registerUser — token + email**

W `registerUser`, wewnątrz bloku `prisma.$transaction`, dodaj `emailVerificationToken` do `tx.user.create`:

Zmień `data` w `tx.user.create` — dodaj po `accountStatus: 'PENDING'`:
```ts
emailVerificationToken: crypto.randomBytes(32).toString('hex'),
```

Po zamknięciu transakcji (po bloku `.catch(() => {})` który notyfikuje adminów), dodaj wysyłkę emaila:

```ts
// Send verification email (fire-and-forget — don't fail registration if email fails)
if (user.emailVerificationToken) {
  const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${user.emailVerificationToken}`;
  sendEmail(
    user.email,
    'Aktywuj swoje konto w COSMO',
    `<p>Witaj ${user.name},</p>
     <p>Kliknij poniższy link, aby aktywować swoje konto:</p>
     <p><a href="${verifyUrl}" style="background:#1A3828;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Aktywuj konto</a></p>
     <p>Lub skopiuj link: ${verifyUrl}</p>`
  ).catch((err) => console.error('[registerUser] Failed to send verification email:', err));
}
```

- [ ] **Zaktualizuj loginUser — rozróżnij PENDING z tokenem vs bez**

Znajdź w `loginUser` (linia ~101):
```ts
if (raw.accountStatus === 'PENDING') {
  throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
}
```

Zamień na:
```ts
if (raw.accountStatus === 'PENDING') {
  if (raw.emailVerificationToken) {
    throw new AppError('Potwierdź swój adres email. Sprawdź skrzynkę pocztową i kliknij link aktywacyjny.', 403);
  }
  throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
}
```

- [ ] **Zaktualizuj loginWithGoogle — czyść stale token przy merge**

Znajdź w `loginWithGoogle` blok merge (linia ~151):
```ts
user = await prisma.user.update({
  where: { id: user.id },
  data: {
    googleId: user.googleId ?? googleId,
    accountStatus: 'ACTIVE',
  },
});
```

Dodaj `emailVerificationToken: null`:
```ts
user = await prisma.user.update({
  where: { id: user.id },
  data: {
    googleId: user.googleId ?? googleId,
    accountStatus: 'ACTIVE',
    emailVerificationToken: null,
  },
});
```

- [ ] **Dodaj funkcję verifyEmail na końcu auth.service.ts**

```ts
export const verifyEmail = async (token: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    throw new AppError('Nieprawidłowy lub już użyty link aktywacyjny', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accountStatus: 'ACTIVE',
      emailVerificationToken: null,
    },
  });
};
```

- [ ] **Weryfikuj TypeScript backendu**

```bash
npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: brak błędów

- [ ] **Commit**

```bash
git add apps/server/src/modules/auth/auth.service.ts
git commit -m "feat: add email verification token to registration, verifyEmail service function"
```

---

## Task 5: auth.controller.ts + auth.router.ts

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts`
- Modify: `apps/server/src/modules/auth/auth.router.ts`

- [ ] **Dodaj handler verifyEmail do kontrolera**

Na końcu `apps/server/src/modules/auth/auth.controller.ts` dodaj:

```ts
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };

  if (!token) {
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=invalid-token`);
  }

  try {
    await authService.verifyEmail(token);
    return res.redirect(`${env.CLIENT_URL}/auth/login?verified=true`);
  } catch {
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=invalid-token`);
  }
};
```

> Uwaga: ten handler używa `res.redirect()` zamiast `next(err)` — to celowe, endpoint jest wywoływany przez przeglądarkę klikającą link w emailu.

- [ ] **Dodaj route do routera**

W `apps/server/src/modules/auth/auth.router.ts`, przed `export default router`, dodaj:

```ts
router.get('/verify-email', authController.verifyEmail);
```

- [ ] **Weryfikuj TypeScript backendu**

```bash
npx tsc --noEmit -p apps/server/tsconfig.json 2>&1
```
Expected: brak błędów

- [ ] **Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts apps/server/src/modules/auth/auth.router.ts
git commit -m "feat: add GET /auth/verify-email endpoint"
```

---

## Task 6: Frontend — Register.tsx + Login.tsx

**Files:**
- Modify: `apps/web/src/pages/auth/Register.tsx`
- Modify: `apps/web/src/pages/auth/Login.tsx`

- [ ] **Zaktualizuj Register.tsx — komunikat zamiast redirect**

Otwórz `apps/web/src/pages/auth/Register.tsx`.

Dodaj state `emailSent` i `registeredEmail` po istniejących stanach:
```ts
const [emailSent, setEmailSent] = useState(false);
const [registeredEmail, setRegisteredEmail] = useState('');
```

W `onSubmit`, zamień:
```ts
toast.success('Rejestracja przyjęta. Konto zostanie aktywowane po weryfikacji przez administratora.');
navigate('/auth/login', { state: from ? { from } : undefined });
```

na:
```ts
setRegisteredEmail(data.email);
setEmailSent(true);
```

Na początku JSX returna (przed `<div className="flex justify-center...`), dodaj warunek:
```tsx
if (emailSent) {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-heading text-primary font-bold">Sprawdź skrzynkę</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Wysłaliśmy link aktywacyjny na adres
          </p>
          <p className="font-semibold text-foreground">{registeredEmail}</p>
          <p className="text-sm text-muted-foreground">
            Kliknij link w emailu, aby aktywować konto i zalogować się.
          </p>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground border-t pt-6 bg-muted/10 rounded-b-xl">
          Masz już konto? <Link to="/auth/login" className="ml-2 font-bold text-primary hover:underline">Zaloguj się</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
```

- [ ] **Zaktualizuj Login.tsx — obsługa ?verified=true i ?error=invalid-token**

Otwórz `apps/web/src/pages/auth/Login.tsx`.

Dodaj import:
```ts
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
```

Wewnątrz komponentu `Login`, dodaj po istniejących hookach:
```ts
const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  if (searchParams.get('verified') === 'true') {
    toast.success('Konto aktywowane! Możesz się teraz zalogować.');
    setSearchParams({}, { replace: true });
  }
  if (searchParams.get('error') === 'invalid-token') {
    toast.error('Link aktywacyjny jest nieprawidłowy lub został już użyty.');
    setSearchParams({}, { replace: true });
  }
}, [searchParams, setSearchParams]);
```

- [ ] **Weryfikuj TypeScript frontendu**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1
```
Expected: brak błędów

- [ ] **Uruchom wszystkie testy backendu**

```bash
cd apps/server && pnpm test 2>&1 | tail -8
```
Expected: 11 test files passed, 64 tests passed

- [ ] **Commit**

```bash
git add apps/web/src/pages/auth/Register.tsx apps/web/src/pages/auth/Login.tsx
git commit -m "feat: show email sent confirmation on register, handle verified param on login"
```

---

## Weryfikacja end-to-end

Po uruchomieniu `pnpm dev`:

- [ ] Zarejestruj nowe konto → powinien pojawić się ekran "Sprawdź skrzynkę"
- [ ] Sprawdź skrzynkę emailową — powinien przyjść email z linkiem aktywacyjnym
- [ ] Kliknij link → przekierowanie na `/auth/login?verified=true` → toast "Konto aktywowane!"
- [ ] Zaloguj się — działa normalnie
- [ ] Spróbuj zalogować się przed kliknięciem linku → błąd "Potwierdź swój adres email"

> **Resend FROM uwaga:** Jeśli domena `twojadomena.pl` nie jest jeszcze zweryfikowana w Resend, użyj tymczasowo `RESEND_FROM=onboarding@resend.dev` — Resend pozwala wysyłać z tej adresu testowo, ale tylko na adres email przypisany do konta Resend.
