# Trwała sesja w PWA — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Użytkownik, który raz zalogował się w PWA, nie zostaje nigdy wylogowany samoczynnie — dzięki czemu subskrypcja push pozostaje aktywna.

**Architecture:** Dwa niezależne mechanizmy. Pierwszy: refresh token nie jest kasowany natychmiast po rotacji, lecz przez 60 s zwraca ten sam token następcy (usuwa wyścig między PWA a kartą przeglądarki). Drugi: token urządzenia w `localStorage` jako druga ścieżka odtworzenia sesji, odporna na kasowanie ciasteczek przez iOS. Czysta logika trafia do nowego `session.service.ts`, testowanego jednostkowo z mockowanym Prisma; kontroler zostaje cienką warstwą HTTP.

**Tech Stack:** Node 20, Express 5, Prisma, PostgreSQL, vitest 1.6, React 19, Zustand, axios.

**Spec:** `docs/superpowers/specs/2026-08-10-trwala-sesja-pwa-design.md`

## Global Constraints

- Okno karencji przy rotacji: **60 sekund** (`ROTATION_GRACE_MS = 60_000`).
- Ważność tokenu urządzenia: **400 dni**, zgodnie z istniejącym `LONG_LIVED_REFRESH_TTL_DAYS = 400` w `auth.controller.ts:34`.
- Klucz w `localStorage`: **`cosmo-device-token`**.
- Nagłówek HTTP tokenu urządzenia: **`X-Device-Token`**.
- Token urządzenia to losowe 32 bajty w hex (**nie** JWT); w bazie trzymamy wyłącznie `sha256` — tak samo jak dla refresh tokenów (`auth.controller.ts:173`).
- **Nie wykrywamy ponownego użycia tokenu.** Token po karencji dostaje zwykłe 401 i **nie** kasuje żadnych innych sesji — decyzja z 2026-08-10, uzasadniona w specu. Jedyne masowe odcięcie to zmiana hasła.
- Komunikaty błędów po polsku, spójnie z resztą modułu auth.
- Wszystkie ścieżki dotyczą wszystkich ról (USER, EMPLOYEE, ADMIN) — decyzja z 2026-08-10.

## File Structure

| Plik | Odpowiedzialność |
|---|---|
| `apps/server/prisma/schema.prisma` | 2 pola w `RefreshToken`, nowy model `DeviceToken`, relacja w `User` |
| `apps/server/src/modules/auth/session.service.ts` | **nowy** — cała logika rotacji i tokenów urządzeń; jedyne miejsce dotykające tych tabel |
| `apps/server/src/modules/auth/session.service.test.ts` | **nowy** — testy jednostkowe powyższego |
| `apps/server/src/modules/auth/auth.controller.ts` | cienka warstwa HTTP: `refresh` deleguje do serwisu, nowy `refreshDevice` |
| `apps/server/src/modules/auth/auth.router.ts` | trasa `POST /auth/refresh-device` |
| `apps/server/src/modules/users/users.service.ts` | zmiana hasła kasuje tokeny urządzeń |
| `apps/web/src/lib/axios.ts` | fallback wewnątrz `refreshSession()` |
| `apps/web/src/lib/device-token.ts` | **nowy** — odczyt/zapis/kasowanie klucza w `localStorage` |
| `apps/web/src/lib/device-token.test.ts` | **nowy** — testy powyższego |
| `apps/web/src/api/auth.api.ts` | zapis `deviceToken` z odpowiedzi logowania |

---

### Task 1: Schemat bazy i migracja

**Files:**
- Modify: `apps/server/prisma/schema.prisma:309-318`
- Modify: `apps/server/prisma/schema.prisma` (model `User` — dodanie relacji)

**Interfaces:**
- Consumes: nic (pierwsze zadanie)
- Produces: model `DeviceToken` z polami `id, tokenHash, userId, label, expiresAt, lastUsedAt, createdAt`; pole `RefreshToken.rotatedAt: DateTime?`

- [ ] **Step 1: Rozszerz model `RefreshToken`**

W `apps/server/prisma/schema.prisma` zamień model `RefreshToken` (linie 309-318) na:

```prisma
model RefreshToken {
  id         String    @id @default(cuid())
  tokenHash  String    @unique
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  rotatedAt  DateTime?

  @@index([userId])
  @@index([rotatedAt])
}
```

- [ ] **Step 2: Dodaj model `DeviceToken`**

Bezpośrednio pod modelem `RefreshToken`:

```prisma
model DeviceToken {
  id         String   @id @default(cuid())
  tokenHash  String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label      String?
  expiresAt  DateTime
  lastUsedAt DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Step 3: Dodaj relację w modelu `User`**

Znajdź w modelu `User` linię z `refreshTokens RefreshToken[]` i dodaj pod nią:

```prisma
  deviceTokens  DeviceToken[]
```

- [ ] **Step 4: Wygeneruj migrację**

Run: `cd apps/server && pnpm prisma migrate dev --name add_device_token_and_refresh_rotation`
Expected: migracja utworzona, `prisma generate` wykonany automatycznie, brak błędów.

- [ ] **Step 5: Sprawdź, że klient Prisma zna nowe typy**

Run: `cd apps/server && pnpm exec tsc --noEmit`
Expected: brak błędów (istniejący kod nadal się kompiluje).

- [ ] **Step 6: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations
git commit -m "feat(auth): model tokenu urządzenia i pola rotacji refresh tokenu"
```

---

### Task 2: Rotacja refresh tokenu z oknem karencji

**Files:**
- Create: `apps/server/src/modules/auth/session.service.ts`
- Test: `apps/server/src/modules/auth/session.service.test.ts`

**Interfaces:**
- Consumes: model `RefreshToken` z Task 1 (`rotatedAt`)
- Produces:
  - `hashToken(raw: string): string`
  - `generateRawToken(): string`
  - `ROTATION_GRACE_MS: number` (60_000)
  - `DEVICE_TOKEN_TTL_MS: number`
  - `rotateRefreshToken(rawToken: string, userId: string, ttlMs: number): Promise<{ stale: false; token: string; expiresAt: Date } | { stale: true }>` — zwraca **świeży** token; `stale: true` oznacza token nieznany lub wygasły, na co wołający odpowiada 401 **bez** żadnych skutków ubocznych

- [ ] **Step 1: Napisz test rotacji w oknie karencji**

Utwórz `apps/server/src/modules/auth/session.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    deviceToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

// config/prisma.ts eksportuje `export const prisma` — mock musi to odwzorować.
vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

import { rotateRefreshToken, hashToken } from './session.service';

describe('rotateRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wydaje świeży token przy pierwszym użyciu', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result.stale).toBe(false);
    if (!result.stale) expect(result.token).not.toBe('stary');
  });
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

Run: `cd apps/server && pnpm vitest run src/modules/auth/session.service.test.ts`
Expected: FAIL — `Failed to resolve import "./session.service"`.

- [ ] **Step 3: Napisz `session.service.ts`**

Utwórz `apps/server/src/modules/auth/session.service.ts`:

```typescript
import crypto from 'crypto';
import { prisma } from '../../config/prisma';

export const ROTATION_GRACE_MS = 60_000;
const DEVICE_TOKEN_TTL_DAYS = 400;
export const DEVICE_TOKEN_TTL_MS = DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export const hashToken = (raw: string) =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateRawToken = () => crypto.randomBytes(32).toString('hex');
```

- [ ] **Step 4: Uruchom test — nadal nie przechodzi z innego powodu**

Run: `cd apps/server && pnpm vitest run src/modules/auth/session.service.test.ts`
Expected: FAIL — `rotateRefreshToken is not a function`.

- [ ] **Step 5: Dopisz `rotateRefreshToken`**

Dopisz na końcu `session.service.ts`:

```typescript
type RotationResult =
  | { stale: false; token: string; expiresAt: Date }
  | { stale: true };

/**
 * Rotuje refresh token, zostawiając staremu 60-sekundowe okno karencji.
 *
 * Bez karencji dwa konteksty aplikacji (zainstalowana PWA i karta przeglądarki)
 * potrafią odświeżyć sesję jednocześnie: pierwszy skasowałby token, drugi
 * dostałby 401 i wylogował użytkownika. Zamiast kasować, skracamy staremu
 * termin ważności — przez minutę obsłuży drugi kontekst, po czym wygaśnie sam.
 *
 * Celowo nie wykrywamy tu ponownego użycia tokenu: PWA potrafi leżeć w tle
 * godzinami i wrócić ze starym tokenem, więc kasowanie sesji przy takim
 * zdarzeniu wylogowywałoby uczciwych użytkowników. Token po karencji dostaje
 * zwykłe 401, a token urządzenia odtwarza sesję.
 */
export const rotateRefreshToken = async (
  rawToken: string,
  userId: string,
  ttlMs: number,
): Promise<RotationResult> => {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt <= new Date()) return { stale: true };

  const nextRaw = generateRawToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  const graceExpiry = new Date(Date.now() + ROTATION_GRACE_MS);

  await prisma.$transaction([
    // Skracamy ważność tylko przy pierwszej rotacji — powtórne użycie w oknie
    // karencji nie przedłuża go w nieskończoność.
    prisma.refreshToken.updateMany({
      where: { tokenHash, rotatedAt: null },
      data: { rotatedAt: new Date(), expiresAt: graceExpiry },
    }),
    prisma.refreshToken.create({
      data: { tokenHash: hashToken(nextRaw), userId, expiresAt },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId, rotatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { stale: false, token: nextRaw, expiresAt };
};
```

- [ ] **Step 6: Dostosuj test do finalnej sygnatury**

Zamień treść testu z kroku 1 na (zwróć uwagę na trzeci argument `ttlMs`):

```typescript
  it('wydaje świeży token także przy powtórnym użyciu w oknie karencji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 30_000),
      rotatedAt: new Date(Date.now() - 5_000),
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result.stale).toBe(false);
    if (!result.stale) expect(result.token).not.toBe('stary');
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
  });

  it('skraca ważność starego tokenu tylko przy pierwszej rotacji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    await rotateRefreshToken('stary', 'user-1', 1000);

    const updateArgs = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ tokenHash: hashToken('stary'), rotatedAt: null });
  });

  it('zwraca stale dla tokenu wygasłego i nie kasuje innych sesji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      rotatedAt: new Date(Date.now() - 120_000),
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result).toEqual({ stale: true });
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('zwraca stale dla tokenu nieznanego', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

    expect(await rotateRefreshToken('obcy', 'user-1', 1000)).toEqual({ stale: true });
  });
```

- [ ] **Step 7: Uruchom testy — mają przejść**

Run: `cd apps/server && pnpm vitest run src/modules/auth/session.service.test.ts`
Expected: PASS, 5 testów.

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/modules/auth/session.service.ts apps/server/src/modules/auth/session.service.test.ts
git commit -m "feat(auth): rotacja refresh tokenu z oknem karencji"
```

---

### Task 3: Wydawanie i konsumpcja tokenu urządzenia

**Files:**
- Modify: `apps/server/src/modules/auth/session.service.ts`
- Test: `apps/server/src/modules/auth/session.service.test.ts`

**Interfaces:**
- Consumes: `hashToken`, `generateRawToken`, `DEVICE_TOKEN_TTL_MS` z Task 2
- Produces:
  - `issueDeviceToken(userId: string, label?: string): Promise<string>` — zwraca surowy token do oddania klientowi
  - `consumeDeviceToken(rawToken: string): Promise<string | null>` — zwraca `userId` albo `null`; przedłuża ważność przy użyciu

- [ ] **Step 1: Napisz testy**

Dopisz w `session.service.test.ts` nowy blok:

```typescript
import { issueDeviceToken, consumeDeviceToken } from './session.service';

describe('tokeny urządzeń', () => {
  beforeEach(() => vi.clearAllMocks());

  it('zapisuje wyłącznie hash, zwraca surowy token', async () => {
    mockPrisma.deviceToken.create.mockResolvedValueOnce({});

    const raw = await issueDeviceToken('user-1', 'iPhone');

    expect(raw).toHaveLength(64);
    const args = mockPrisma.deviceToken.create.mock.calls[0][0];
    expect(args.data.tokenHash).toBe(hashToken(raw));
    expect(args.data.tokenHash).not.toBe(raw);
    expect(args.data.userId).toBe('user-1');
  });

  it('zwraca userId i przedłuża ważność ważnego tokenu', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('raw'),
      userId: 'user-7',
      expiresAt: new Date(Date.now() + 10_000),
    });
    mockPrisma.deviceToken.update.mockResolvedValueOnce({});

    const userId = await consumeDeviceToken('raw');

    expect(userId).toBe('user-7');
    expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
  });

  it('odrzuca token wygasły', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('raw'),
      userId: 'user-7',
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await consumeDeviceToken('raw')).toBeNull();
  });

  it('odrzuca token nieznany', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce(null);

    expect(await consumeDeviceToken('raw')).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom testy i potwierdź, że nie przechodzą**

Run: `cd apps/server && pnpm vitest run src/modules/auth/session.service.test.ts`
Expected: FAIL — `issueDeviceToken is not a function`.

- [ ] **Step 3: Zaimplementuj obie funkcje**

Dopisz na końcu `session.service.ts`:

```typescript
export const issueDeviceToken = async (userId: string, label?: string) => {
  const raw = generateRawToken();
  await prisma.deviceToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId,
      label: label ?? null,
      expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS),
    },
  });
  return raw;
};

export const consumeDeviceToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.deviceToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt <= new Date()) return null;

  // Sliding window: każde użycie przesuwa termin ważności.
  await prisma.deviceToken.update({
    where: { tokenHash },
    data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS) },
  });

  return stored.userId;
};

export const revokeDeviceTokens = (userId: string) =>
  prisma.deviceToken.deleteMany({ where: { userId } });
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `cd apps/server && pnpm vitest run src/modules/auth/session.service.test.ts`
Expected: PASS, 9 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/auth/session.service.ts apps/server/src/modules/auth/session.service.test.ts
git commit -m "feat(auth): wydawanie i konsumpcja tokenów urządzeń"
```

---

### Task 4: Podłącz karencję do istniejącego `/auth/refresh`

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts:686-700`

**Interfaces:**
- Consumes: `rotateRefreshToken` z Task 2
- Produces: `/auth/refresh` przestaje kasować stary token natychmiast

- [ ] **Step 1: Zaimportuj serwis**

W `auth.controller.ts`, przy pozostałych importach:

```typescript
import { rotateRefreshToken, issueDeviceToken } from './session.service';
```

- [ ] **Step 2: Zastąp blok rotacji**

W funkcji `refresh` zamień blok od `const newRefreshToken = signToken(...)` do `res.cookie('refreshToken', newRefreshToken, ...)` (linie 686-700) na:

```typescript
    const rotation = await rotateRefreshToken(refreshToken, user.id, LONG_LIVED_REFRESH_TTL_MS);

    if (rotation.stale) {
      clearAllRefreshCookies(res);
      throw new AppError('Token odświeżania wygasł lub został unieważniony', 401);
    }

    clearAllRefreshCookies(res);
    res.cookie('refreshToken', rotation.token, buildRefreshCookieOptions(LONG_LIVED_REFRESH_TTL_MS));
```

Uwaga: `rotation.token` jest teraz losowym ciągiem, nie JWT. Kontrola `passwordChangedAt` opiera się na `decoded.iat` z tokenu **wejściowego** i pozostaje bez zmian powyżej — nadal działa, bo tokeny wydane przy logowaniu są JWT. Nowe tokeny rotacyjne nie niosą `iat`, dlatego Task 6 dokłada kasowanie tokenów przy zmianie hasła.

- [ ] **Step 3: Sprawdź kompilację**

Run: `cd apps/server && pnpm exec tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 4: Uruchom cały pakiet testów serwera**

Run: `cd apps/server && pnpm test`
Expected: PASS — żaden istniejący test nie został zepsuty.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts
git commit -m "feat(auth): /auth/refresh używa rotacji z karencją"
```

---

### Task 5: Endpoint `POST /auth/refresh-device`

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts`
- Modify: `apps/server/src/modules/auth/auth.router.ts:19`

**Interfaces:**
- Consumes: `consumeDeviceToken`, `issueDeviceToken` z Task 3; `buildRefreshCookieOptions`, `LONG_LIVED_REFRESH_TTL_MS` z `auth.controller.ts`
- Produces: `POST /auth/refresh-device` przyjmujący nagłówek `X-Device-Token`, zwracający `{ status, data: { accessToken, user } }` i ustawiający świeże ciasteczko `refreshToken`

- [ ] **Step 1: Dopisz handler**

Na końcu `auth.controller.ts`:

```typescript
/**
 * Druga ścieżka odtworzenia sesji, gdy ciasteczko refreshToken zniknęło —
 * typowo po wyczyszczeniu danych witryny przez iOS. Odbudowuje także ciasteczko.
 */
export const refreshDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.headers['x-device-token'];
    const deviceToken = Array.isArray(raw) ? raw[0] : raw;

    if (!deviceToken) throw new AppError('Brak tokenu urządzenia', 401);

    const userId = await consumeDeviceToken(deviceToken);
    if (!userId) throw new AppError('Token urządzenia wygasł lub został unieważniony', 401);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Użytkownik nie istnieje', 401);

    if (user.accountStatus === 'PENDING' || user.accountStatus === 'REJECTED') {
      throw new AppError('Konto nie jest aktywne', 403);
    }

    const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);

    const newRefreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, LONG_LIVED_REFRESH_TTL);
    await prisma.refreshToken.create({
      data: {
        tokenHash: crypto.createHash('sha256').update(newRefreshToken).digest('hex'),
        userId: user.id,
        expiresAt: new Date(Date.now() + LONG_LIVED_REFRESH_TTL_MS),
      },
    });

    clearAllRefreshCookies(res);
    res.cookie('refreshToken', newRefreshToken, buildRefreshCookieOptions(LONG_LIVED_REFRESH_TTL_MS));

    res.status(200).json({
      status: 'success',
      data: { accessToken, user: authService.toAuthUser(user) },
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Nieprawidłowy token urządzenia', 401));
  }
};
```

Uzupełnij import z Task 4 o `consumeDeviceToken`:

```typescript
import { rotateRefreshToken, issueDeviceToken, consumeDeviceToken } from './session.service';
```

- [ ] **Step 2: Zarejestruj trasę**

W `auth.router.ts` pod linią z `/refresh`:

```typescript
router.post('/refresh-device', authRateLimiter, authController.refreshDevice);
```

- [ ] **Step 3: Sprawdź kompilację**

Run: `cd apps/server && pnpm exec tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts apps/server/src/modules/auth/auth.router.ts
git commit -m "feat(auth): endpoint odtwarzania sesji z tokenu urządzenia"
```

---

### Task 6: Wydawanie tokenu urządzenia przy logowaniu i unieważnianie przy zmianie hasła

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts:168-180` (wspólny helper odpowiedzi) oraz `:332-345` (login)
- Modify: `apps/server/src/modules/users/users.service.ts:554-557`

**Interfaces:**
- Consumes: `issueDeviceToken`, `revokeDeviceTokens` z Task 3
- Produces: odpowiedzi logowania zawierają pole `deviceToken: string`

- [ ] **Step 1: Niech `persistAuthSession` zwraca token urządzenia**

`persistAuthSession` (`auth.controller.ts:166-181`) jest wspólne dla rejestracji,
Google i Facebooka, więc jedna zmiana pokrywa wszystkie te ścieżki. Zamień jego
sygnaturę i koniec ciała tak, by zwracało świeży token urządzenia:

```typescript
const persistAuthSession = async (
  res: Response,
  result: { refreshToken: string; user: { id: string } },
): Promise<string> => {
  const tokenTtlMs = LONG_LIVED_REFRESH_TTL_MS;
  clearAllRefreshCookies(res);
  res.cookie('refreshToken', result.refreshToken, buildRefreshCookieOptions(tokenTtlMs));
  const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: result.user.id,
      expiresAt: new Date(Date.now() + tokenTtlMs),
    },
  });
  return issueDeviceToken(result.user.id);
};
```

Następnie w każdym miejscu wołającym `await persistAuthSession(res, result)`
przechwyć wynik i dołóż go do odpowiedzi:

```typescript
    const deviceToken = await persistAuthSession(res, result);
    // ...w res.json: data: { accessToken, user, deviceToken }
```

Run: `cd apps/server && grep -n "persistAuthSession(" src/modules/auth/auth.controller.ts`
— przejdź po kolei przez wszystkie trafienia, żeby żadnej ścieżki nie pominąć.

- [ ] **Step 2: To samo w ścieżce logowania hasłem**

Handler `login` (okolice linii 332-345) nie korzysta z `persistAuthSession`, tylko
sam zapisuje token. Po `await prisma.refreshToken.create({...})` dopisz:

```typescript
    const deviceToken = await issueDeviceToken(result.user.id);
```

i rozszerz odpowiedź:

```typescript
    res.status(200).json({
      status: 'success',
      data: { accessToken: result.accessToken, user: result.user, deviceToken },
    });
```

Zachowaj nazwy pól dokładnie takie, jakie są dziś w tym handlerze — dopisujesz
wyłącznie `deviceToken`.

- [ ] **Step 3: Zmiana hasła kasuje tokeny urządzeń**

W `apps/server/src/modules/users/users.service.ts` po `prisma.user.update({ ... passwordChangedAt: new Date() ... })` (linia 554-557) dopisz:

```typescript
  await prisma.deviceToken.deleteMany({ where: { userId } });
```

To awaryjne odcięcie wszystkich urządzeń — jedyna droga odebrania dostępu zgubionemu telefonowi.

- [ ] **Step 4: Napisz test odcięcia**

W `apps/server/src/modules/auth/session.service.test.ts`:

```typescript
  it('revokeDeviceTokens kasuje tokeny wskazanego użytkownika', async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValueOnce({ count: 2 });

    await revokeDeviceTokens('user-9');

    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-9' } });
  });
```

Dodaj `revokeDeviceTokens` do importu z `./session.service`.

- [ ] **Step 5: Uruchom testy**

Run: `cd apps/server && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts apps/server/src/modules/users/users.service.ts apps/server/src/modules/auth/session.service.test.ts
git commit -m "feat(auth): wydawaj token urządzenia przy logowaniu, kasuj przy zmianie hasła"
```

---

### Task 7: Przechowywanie tokenu urządzenia po stronie klienta

**Files:**
- Create: `apps/web/src/lib/device-token.ts`
- Test: `apps/web/src/lib/device-token.test.ts`

**Interfaces:**
- Consumes: nic
- Produces: `getDeviceToken(): string | null`, `setDeviceToken(token: string): void`, `clearDeviceToken(): void`

- [ ] **Step 1: Napisz testy**

Utwórz `apps/web/src/lib/device-token.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceToken, setDeviceToken, clearDeviceToken } from './device-token';

describe('device-token', () => {
  beforeEach(() => localStorage.clear());

  it('zwraca null, gdy nic nie zapisano', () => {
    expect(getDeviceToken()).toBeNull();
  });

  it('zapisuje i odczytuje token', () => {
    setDeviceToken('abc123');
    expect(getDeviceToken()).toBe('abc123');
  });

  it('kasuje token', () => {
    setDeviceToken('abc123');
    clearDeviceToken();
    expect(getDeviceToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

Run: `cd apps/web && pnpm vitest run src/lib/device-token.test.ts`
Expected: FAIL — `Failed to resolve import "./device-token"`.

- [ ] **Step 3: Zaimplementuj moduł**

Utwórz `apps/web/src/lib/device-token.ts`:

```typescript
const KEY = 'cosmo-device-token';

/**
 * Token urządzenia żyje w localStorage, a nie w ciasteczku — dzięki temu
 * przeżywa czyszczenie ciasteczek przez system (typowe na iOS po kilku dniach
 * nieużywania aplikacji) i pozwala odtworzyć sesję bez ponownego logowania.
 */
export const getDeviceToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setDeviceToken = (token: string) => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Prywatny tryb przeglądarki potrafi blokować zapis — sesja działa wtedy
    // wyłącznie na ciasteczku, czyli jak dotychczas.
  }
};

export const clearDeviceToken = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // jw.
  }
};
```

- [ ] **Step 4: Uruchom testy — mają przejść**

Run: `cd apps/web && pnpm vitest run src/lib/device-token.test.ts`
Expected: PASS, 3 testy.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/device-token.ts apps/web/src/lib/device-token.test.ts
git commit -m "feat(web): przechowywanie tokenu urządzenia"
```

---

### Task 8: Fallback wewnątrz `refreshSession()`

**Files:**
- Modify: `apps/web/src/lib/axios.ts:48-86`
- Modify: `apps/web/src/api/auth.api.ts:33-36`

**Interfaces:**
- Consumes: `getDeviceToken`, `setDeviceToken` z Task 7; endpoint `/auth/refresh-device` z Task 5
- Produces: `refreshSession()` odrzuca obietnicę z 401 dopiero, gdy **obie** ścieżki zawiodą

- [ ] **Step 1: Zapisuj token urządzenia po zalogowaniu**

W `apps/web/src/api/auth.api.ts` rozszerz typ odpowiedzi:

```typescript
type AuthResponseData = {
  user: User;
  accessToken: string;
  deviceToken?: string;
};
```

i w metodzie `login` po otrzymaniu odpowiedzi:

```typescript
  login: async (data: LoginInput) => {
    const res = await api.post<AuthResponseEnvelope>('/auth/login', data);
    if (res.data.data.deviceToken) setDeviceToken(res.data.data.deviceToken);
    return res.data.data;
  },
```

Dodaj import: `import { setDeviceToken } from '@/lib/device-token';`

- [ ] **Step 2: Wydziel dotychczasową ścieżkę ciasteczkową**

W `apps/web/src/lib/axios.ts` zmień ciało `refreshSession()` tak, by żądanie sieciowe wykonywała osobna funkcja:

```typescript
import { getDeviceToken, setDeviceToken } from './device-token';

async function requestRefresh(): Promise<{ accessToken: string; user?: unknown }> {
  try {
    const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });
    return data.data;
  } catch (err) {
    // Ciasteczko zniknęło lub wygasło — spróbuj tokenu urządzenia.
    const deviceToken = getDeviceToken();
    if (!isUnauthorizedRefreshFailure(err) || !deviceToken) throw err;

    const { data } = await api.post(
      '/auth/refresh-device',
      {},
      { withCredentials: true, headers: { 'X-Device-Token': deviceToken } },
    );
    if (data.data.deviceToken) setDeviceToken(data.data.deviceToken);
    return data.data;
  }
}
```

- [ ] **Step 3: Wepnij ją w istniejący single-flight**

W `refreshSession()` zamień `api.post('/auth/refresh', ...)` na `requestRefresh()`, zachowując resztę łańcucha (`.then` z zapisem tokenu i reconnectem socketu, `.catch`, `.finally`) bez zmian:

```typescript
  return requestRefresh()
    .then(async (payload) => {
      const newToken: string = payload.accessToken;
      // ...reszta bez zmian
```

- [ ] **Step 4: Napisz test fallbacku**

Utwórz `apps/web/src/lib/axios.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDeviceToken } from './device-token';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({ post, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }, defaults: { headers: { common: {} } } }),
    isAxiosError: (e: any) => Boolean(e?.response),
  },
}));

vi.mock('./socket', () => ({ getSocket: () => ({ connected: false, auth: {} }) }));

describe('refreshSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('sięga po token urządzenia dopiero po 401 z ciasteczka', async () => {
    setDeviceToken('device-abc');
    post.mockRejectedValueOnce({ response: { status: 401 } });
    post.mockResolvedValueOnce({ data: { data: { accessToken: 'nowy-token' } } });

    const { refreshSession } = await import('./axios');
    const token = await refreshSession();

    expect(token).toBe('nowy-token');
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0]).toBe('/auth/refresh-device');
  });

  it('odrzuca obietnicę, gdy brak tokenu urządzenia', async () => {
    post.mockRejectedValueOnce({ response: { status: 401 } });

    const { refreshSession } = await import('./axios');

    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 401 } });
    expect(post).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Uruchom testy**

Run: `cd apps/web && pnpm vitest run src/lib/axios.test.ts`
Expected: PASS, 2 testy.

- [ ] **Step 6: Sprawdź kompilację i budowę frontendu**

Run: `cd apps/web && pnpm build`
Expected: build kończy się sukcesem.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/axios.ts apps/web/src/lib/axios.test.ts apps/web/src/api/auth.api.ts
git commit -m "feat(web): odtwarzanie sesji z tokenu urządzenia po utracie ciasteczka"
```

---

### Task 9: Weryfikacja końcowa i wdrożenie

**Files:**
- Modify: brak (wyłącznie uruchomienia i wdrożenie)

**Interfaces:**
- Consumes: wszystko powyżej
- Produces: działające wdrożenie

- [ ] **Step 1: Pełny pakiet testów**

Run: `cd cosmo-app && pnpm test`
Expected: PASS we wszystkich pakietach.

- [ ] **Step 2: Pełna budowa**

Run: `cd cosmo-app && pnpm build`
Expected: sukces.

- [ ] **Step 3: Ręczny scenariusz karencji**

Uruchom `pnpm dev`, zaloguj się, otwórz DevTools → Network. Wywołaj dwukrotnie
`POST /api/auth/refresh` w odstępie krótszym niż 60 s, używając tego samego
ciasteczka (drugie żądanie z zakładki „Network → Replay").
Expected: oba zwracają 200, użytkownik pozostaje zalogowany.

- [ ] **Step 4: Ręczny scenariusz utraty ciasteczka**

W DevTools → Application → Cookies skasuj `refreshToken`, zostawiając
`cosmo-device-token` w Local Storage. Odśwież stronę.
Expected: sesja zostaje odtworzona bez ekranu logowania, a ciasteczko
`refreshToken` pojawia się z powrotem.

- [ ] **Step 5: Ręczny scenariusz odcięcia**

Zmień hasło użytkownika, po czym w drugiej przeglądarce odśwież aplikację.
Expected: przekierowanie na ekran logowania — awaryjne odcięcie działa.

- [ ] **Step 6: Wdróż migrację i backend**

```bash
cd cosmo-app && ./deploy.sh backend
```

Expected: `prisma migrate deploy` wykonuje nową migrację, `cosmo-server` wstaje.

- [ ] **Step 7: Wdróż frontend**

```bash
cd cosmo-app && ./deploy.sh frontend
```

- [ ] **Step 8: Commit ewentualnych poprawek**

```bash
git add -A && git commit -m "chore: poprawki po weryfikacji trwałej sesji"
```

---

## Uwagi wdrożeniowe

**Kolejność wdrożenia ma znaczenie.** Backend musi trafić na serwer przed
frontendem, bo nowy frontend woła `/auth/refresh-device`. Task 9 zachowuje tę
kolejność (krok 6 przed 7).

**Istniejące sesje nie zostaną zerwane.** Tokeny wydane przed wdrożeniem mają
`rotatedAt = NULL`, więc trafiają w ścieżkę normalnej rotacji. Zalogowani
użytkownicy dostaną token urządzenia dopiero przy następnym logowaniu — to
akceptowalne, bo ich obecne ciasteczka nadal działają.

**Ryzyko przyjęte świadomie.** Token urządzenia w `localStorage` jest dostępny
dla JavaScriptu, więc XSS oznacza przejęcie sesji, także administratora.
Ograniczają to: unieważnianie całej rodziny tokenów przy wykryciu kradzieży,
kasowanie przy zmianie hasła oraz polityka CSP.
