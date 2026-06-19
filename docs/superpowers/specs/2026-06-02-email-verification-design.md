# Email Verification — Specyfikacja

**Data:** 2026-06-02
**Projekt:** COSMO — aplikacja salonu kosmetycznego
**Zakres:** Weryfikacja emaila przy rejestracji przez Resend (zamiast zatwierdzenia przez admina)

---

## Cel

Zastąpienie ręcznego zatwierdzania kont przez admina automatyczną weryfikacją adresu email. Użytkownik po rejestracji dostaje email z linkiem aktywacyjnym. Kliknięcie linku aktywuje konto natychmiast.

---

## Baza danych

**Zmiana w modelu `User` (schema.prisma):**

```prisma
emailVerificationToken  String?  @unique
```

Token nie wygasa (bezterminowy). Jeden nowy field.

**Logika statusów:**

| Sytuacja | accountStatus | emailVerificationToken |
|----------|--------------|----------------------|
| Nowa rejestracja emailem | `PENDING` | losowy token (hex) |
| Po kliknięciu linku | `ACTIVE` | `null` |
| Konto Google | `ACTIVE` | `null` |
| Stare konta PENDING (bez tokenu) | `PENDING` | `null` — admin obsługuje jak dotychczas |

---

## Backend

**Nowy pakiet:** `resend`

**Nowe zmienne środowiskowe (`apps/server/.env`):**
```
RESEND_API_KEY=re_...
RESEND_FROM=no-reply@twojadomena.pl
```

**Zmiany w `apps/server/src/config/env.ts`:**
- Dodać `RESEND_API_KEY: z.string().min(1)`
- Dodać `RESEND_FROM: z.string().email()`
- Usunąć `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` ze schematu Zod ORAZ z pliku `.env`

**Zmiany w `apps/server/src/utils/email.ts`:**
- Zastąpić Nodemailer implementację Resend SDK
- Zachować tę samą publiczną sygnaturę: `sendEmail(to: string, subject: string, html: string): Promise<void>`
- Reszta kodu (password reset, etc.) nie wymaga zmian

**Zmiany w `apps/server/src/modules/auth/auth.service.ts`:**

`registerUser`:
1. Generuje `emailVerificationToken` = `crypto.randomBytes(32).toString('hex')`
2. Zapisuje token do nowego usera **wewnątrz istniejącego `prisma.$transaction()`** (atomicznie z tworzeniem usera)
3. Po zakończeniu transakcji wywołuje `sendEmail` z linkiem: `${env.CLIENT_URL}/auth/verify-email?token=<token>`
   - Subject: "Aktywuj swoje konto w COSMO"
   - HTML: prosty email z przyciskiem/linkiem

`loginUser`:
- Jeśli `accountStatus === 'PENDING'` i `emailVerificationToken !== null` → rzuca `AppError('Potwierdź swój adres email. Sprawdź skrzynkę pocztową i kliknij link aktywacyjny.', 403)`
- Jeśli `accountStatus === 'PENDING'` i `emailVerificationToken === null` → zachowanie bez zmian: "Konto oczekuje na zatwierdzenie przez administratora"

Nowa funkcja `verifyEmail(token: string)`:
1. Znajdź usera po `emailVerificationToken`
2. Jeśli nie ma → `AppError('Nieprawidłowy lub już użyty link aktywacyjny', 400)`
3. Ustaw `accountStatus: 'ACTIVE'`, `emailVerificationToken: null`
4. Zwróć sukces

**Zmiany w `apps/server/src/modules/auth/auth.controller.ts`:**
Nowa metoda `verifyEmail`:
- Pobiera `token` z `req.query`
- Wywołuje `authService.verifyEmail(token)`
- Po sukcesie: `res.redirect(302, \`${env.CLIENT_URL}/auth/login?verified=true\`)`
- Po błędzie: `res.redirect(302, \`${env.CLIENT_URL}/auth/login?error=invalid-token\`)`

**Zmiany w `apps/server/src/modules/auth/auth.router.ts`:**
```ts
router.get('/verify-email', authController.verifyEmail);
```

---

## Frontend

**Zmiany w `apps/web/src/pages/auth/Register.tsx`:**
- Po udanej rejestracji: zamiast `navigate('/auth/login')`, pokazuje stan `emailSent = true` z komunikatem:
  > "Wysłaliśmy link aktywacyjny na adres {email}. Sprawdź skrzynkę pocztową i kliknij link, aby aktywować konto."
- Komponent pozostaje na tej samej stronie (nie przekierowuje)

**Zmiany w `apps/web/src/pages/auth/Login.tsx`:**
- Odczytuje `useSearchParams()` przy ładowaniu
- Jeśli `?verified=true` → toast success: "Konto aktywowane! Możesz się teraz zalogować."
- Jeśli `?error=invalid-token` → toast error: "Link aktywacyjny jest nieprawidłowy lub został już użyty."

---

## Uwagi implementacyjne

- Token bez wygasania — celowe, nie dodawać logiki exp
- `verifyEmail` controller używa `res.redirect()` zamiast `next(err)` — poprawne, endpoint jest wywoływany przez przeglądarkę klikającą link
- Edge case: użytkownik z PENDING + emailVerificationToken może zalogować się przez Google (ten sam email) — Google weryfikuje email, więc aktywacja jest uzasadniona, zachowanie celowe. W bloku merge `loginWithGoogle` należy dodatkowo ustawić `emailVerificationToken: null` żeby nie zostawiać stale tokenów w DB
- `emailVerificationToken` jest sekretem — nie może pojawiać się w żadnych response payloadach zwracanych klientowi (istniejące ścieżki używają explicite select, więc ryzyko niskie)

## Poza zakresem

- Resend email do ponownego wysłania linku (można dodać osobno)
- Zmiana szablonu emaila (można ulepszyć osobno)
- Zmiana statusu istniejących kont PENDING
