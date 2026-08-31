# Eksport wizyt do kalendarza Apple — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Właścicielka subskrybuje jeden adres `webcal://` i widzi wizyty salonu w kalendarzu Apple, a zmiany terminów i odwołania propagują się same.

**Architecture:** Generator ICS to czysty moduł bez zależności (`node-ical` w repo jest wyłącznie parserem). Serwis składa wydarzenia z wizyt i zarządza tokenem w jednowierszowej tabeli `CalendarFeed`. Publiczna trasa `/api/calendar-feed/:token/wizyty.ics` jest rejestrowana bez middleware'u autoryzacji — token jest jedynym poświadczeniem, bo Apple odpytując subskrypcję nie wysyła nagłówka `Authorization`. Panel dostaje dwie trasy admina i sekcję w istniejącym modalu ustawień.

**Tech Stack:** Node/Express 5 + TypeScript + Prisma + PostgreSQL, vitest; frontend React 19 + TanStack Query.

**Spec:** `docs/superpowers/specs/2026-08-31-eksport-wizyt-do-kalendarza-apple-design.md`

## Global Constraints

- Komendy backendu z `cosmo-app/apps/server`, frontendu z `cosmo-app/apps/web`.
- Testy backendu: `pnpm test` (vitest już skonfigurowany; przykład: `src/modules/quiz/quiz.service.test.ts`).
- **Bez nowych zależności.** `node-ical` to parser, nie generator — ICS budujemy sami.
- Format ICS: końce linii **CRLF**, zawijanie po **75 bajtach** (nie znakach — polskie znaki w UTF-8 zajmują dwa bajty), escapowanie `\` `;` `,` i nowej linii w polach TEXT.
- Daty w **UTC z sufiksem `Z`**. VPS pracuje w UTC, właścicielka w strefie warszawskiej; zapis w UTC omija strefy całkowicie i nie wymaga bloku `VTIMEZONE`.
- `UID` stabilny per wizyta — dzięki temu przeniesienie terminu aktualizuje wydarzenie zamiast tworzyć drugie.
- Wizyty ze statusem `CANCELLED` nie trafiają do feedu.
- Okno: 30 dni wstecz, 180 dni w przód.
- **Token nigdy nie trafia do logów aplikacji.** Żadnego `console.log` ze ścieżką w kontrolerze feedu.
- Nieznany token → `404` (nie `401` — odpowiedź nie potwierdza, czy token istnieje).
- Adres wizyty bierze się z `locationAddressAtBooking`, nie z zaszytej stałej — salon ma wiele lokalizacji.
- Teksty UI i komentarze po polsku.
- Trasa feedu dziedziczy globalny limiter `/api` (200 żądań na minutę na adres IP). Apple odpytujące co 5 minut jest od tego progu odległe o trzy rzędy wielkości — nie trzeba nic zmieniać, ale warto o tym wiedzieć, gdyby kiedyś doszły feedy per klientka.

---

### Task 1: Generator ICS

**Files:**
- Create: `apps/server/src/modules/calendar-feed/ics.ts`
- Test: `apps/server/src/modules/calendar-feed/ics.test.ts`

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces:
  - `export interface IcsEvent { uid: string; start: Date; end: Date; summary: string; description?: string; location?: string; lastModified?: Date }`
  - `export function buildIcs(events: IcsEvent[], calendarName: string): string`

- [ ] **Step 1: Write the failing test**

Utwórz `apps/server/src/modules/calendar-feed/ics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildIcs, type IcsEvent } from './ics';

const ev = (partial: Partial<IcsEvent> = {}): IcsEvent => ({
  uid: 'appointment-abc@kosmetologwiktoriacwik.pl',
  start: new Date(Date.UTC(2026, 8, 3, 12, 0, 0)),
  end: new Date(Date.UTC(2026, 8, 3, 13, 30, 0)),
  summary: 'Kowalska — Manicure',
  ...partial,
});

const lines = (ics: string) => ics.split('\r\n');

describe('buildIcs', () => {
  it('otwiera i zamyka kalendarz', () => {
    const out = buildIcs([ev()], 'COSMO — wizyty');
    expect(lines(out)[0]).toBe('BEGIN:VCALENDAR');
    expect(lines(out).filter((l) => l !== '').pop()).toBe('END:VCALENDAR');
  });

  it('rozdziela wszystkie linie przez CRLF', () => {
    const out = buildIcs([ev()], 'COSMO');
    // Żadna samotna \n bez poprzedzającego \r.
    expect(/[^\r]\n/.test(out)).toBe(false);
  });

  it('escapuje średnik, przecinek, ukośnik i nową linię', () => {
    const out = buildIcs([ev({ summary: 'a;b,c\\d', description: 'linia1\nlinia2' })], 'COSMO');
    expect(out).toContain('SUMMARY:a\\;b\\,c\\\\d');
    expect(out).toContain('DESCRIPTION:linia1\\nlinia2');
  });

  it('zawija linię dłuższą niż 75 bajtów, kontynuacja zaczyna się spacją', () => {
    const out = buildIcs([ev({ summary: 'a'.repeat(200) })], 'COSMO');
    const summaryIdx = lines(out).findIndex((l) => l.startsWith('SUMMARY:'));
    expect(lines(out)[summaryIdx + 1].startsWith(' ')).toBe(true);
  });

  it('liczy bajty, nie znaki — 40 polskich liter mieści się w 75 znakach, ale nie w 75 bajtach', () => {
    const summary = 'ą'.repeat(40); // 40 znaków, 80 bajtów; z prefiksem "SUMMARY:" = 88 bajtów
    const out = buildIcs([ev({ summary })], 'COSMO');
    const summaryIdx = lines(out).findIndex((l) => l.startsWith('SUMMARY:'));
    expect(lines(out)[summaryIdx + 1].startsWith(' ')).toBe(true);
  });

  it('nie rozcina znaku wielobajtowego w połowie', () => {
    const out = buildIcs([ev({ summary: 'ż'.repeat(120) })], 'COSMO');
    for (const line of lines(out)) {
      // Ponowne zakodowanie i zdekodowanie nie może wprowadzić znaku zastępczego.
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line);
      expect(line).not.toContain('�');
    }
  });

  it('formatuje daty jako UTC z sufiksem Z', () => {
    const out = buildIcs([ev()], 'COSMO');
    expect(out).toContain('DTSTART:20260903T120000Z');
    expect(out).toContain('DTEND:20260903T133000Z');
  });

  it('pusta lista daje poprawny, pusty kalendarz', () => {
    const out = buildIcs([], 'COSMO');
    expect(out).toContain('BEGIN:VCALENDAR');
    expect(out).toContain('END:VCALENDAR');
    expect(out).not.toContain('BEGIN:VEVENT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/calendar-feed/ics.test.ts`
Expected: FAIL — nie da się rozwiązać importu `./ics`.

- [ ] **Step 3: Write the implementation**

Utwórz `apps/server/src/modules/calendar-feed/ics.ts`:

```ts
export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  lastModified?: Date;
}

const CRLF = '\r\n';
const MAX_OCTETS = 75;

const pad = (n: number) => String(n).padStart(2, '0');

/** Data w UTC — omija strefy czasowe bez dołączania bloku VTIMEZONE. */
const formatUtc = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
  `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Escapowanie wymagane przez RFC 5545 w polach typu TEXT. */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/**
 * Zawija linię po 75 bajtach. Liczymy bajty, nie znaki: polskie znaki w UTF-8
 * zajmują dwa bajty, więc limit znakowy przepuściłby linię przekraczającą
 * dozwoloną długość. Iterujemy po punktach kodowych, żeby nigdy nie rozciąć
 * znaku w połowie. Kontynuacja zaczyna się pojedynczą spacją, która sama zabiera
 * jeden bajt — stąd niższy limit dla kolejnych fragmentów.
 */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;

  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (bytes + chBytes > limit) {
      parts.push(current);
      current = ch;
      bytes = chBytes;
    } else {
      current += ch;
      bytes += chBytes;
    }
  }
  parts.push(current);

  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

export function buildIcs(events: IcsEvent[], calendarName: string): string {
  const now = formatUtc(new Date());
  const out: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//COSMO//Kalendarz wizyt//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    // Podpowiedź dla klienta kalendarza, nie gwarancja — ostatnie słowo ma
    // ustawienie częstotliwości odświeżania po stronie urządzenia.
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  for (const e of events) {
    out.push('BEGIN:VEVENT');
    out.push(`UID:${e.uid}`);
    out.push(`DTSTAMP:${now}`);
    out.push(`DTSTART:${formatUtc(e.start)}`);
    out.push(`DTEND:${formatUtc(e.end)}`);
    out.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) out.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) out.push(`LOCATION:${escapeText(e.location)}`);
    if (e.lastModified) out.push(`LAST-MODIFIED:${formatUtc(e.lastModified)}`);
    out.push('END:VEVENT');
  }

  out.push('END:VCALENDAR');

  return out.map(foldLine).join(CRLF) + CRLF;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/calendar-feed/ics.test.ts`
Expected: PASS — 8 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/calendar-feed/ics.ts apps/server/src/modules/calendar-feed/ics.test.ts
git commit -m "feat(kalendarz): generator plików ICS"
```

---

### Task 2: Model, migracja i serwis feedu

**Files:**
- Modify: `apps/server/prisma/schema.prisma` (model `CalendarFeed`)
- Create: `apps/server/prisma/migrations/20260831120000_add_calendar_feed/migration.sql`
- Create: `apps/server/src/modules/calendar-feed/calendar-feed.service.ts`
- Test: `apps/server/src/modules/calendar-feed/calendar-feed.service.test.ts`

**Interfaces:**
- Consumes: `buildIcs`, `IcsEvent` z Taska 1.
- Produces:
  - `export function initialsOf(name: string): string`
  - `export function isExportableStatus(status: string): boolean`
  - `export interface FeedAppointment { … }` (poniżej)
  - `export function appointmentToIcsEvent(a: FeedAppointment): IcsEvent`
  - `export async function getOrCreateFeed(): Promise<{ token: string; lastAccessedAt: Date | null; accessCount: number }>`
  - `export async function regenerateToken(): Promise<{ token: string }>`
  - `export async function buildFeedForToken(token: string): Promise<string | null>` — `null` gdy token nieznany

- [ ] **Step 1: Write the failing test**

Utwórz `apps/server/src/modules/calendar-feed/calendar-feed.service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  initialsOf,
  isExportableStatus,
  appointmentToIcsEvent,
  type FeedAppointment,
} from './calendar-feed.service';

const appt = (partial: Partial<FeedAppointment> = {}): FeedAppointment => ({
  id: 'abc',
  date: new Date(Date.UTC(2026, 8, 3, 12, 0, 0)),
  status: 'CONFIRMED',
  customDurationMinutes: null,
  finalPrice: 180,
  clientName: null,
  clientPhone: null,
  locationAddressAtBooking: 'ul. Testowa 1, Żywiec',
  updatedAt: new Date(Date.UTC(2026, 8, 1, 8, 0, 0)),
  service: { name: 'Manicure hybrydowy', durationMinutes: 60 },
  employee: { name: 'Anna Kowal' },
  user: { name: 'Maria Nowak', phone: '500100200' },
  ...partial,
});

describe('initialsOf', () => {
  it('bierze pierwsze litery dwóch członów', () => {
    expect(initialsOf('Anna Kowal')).toBe('AK');
  });

  it('dla jednego członu zwraca jedną literę', () => {
    expect(initialsOf('Anna')).toBe('A');
  });

  it('radzi sobie z wielokrotnymi spacjami', () => {
    expect(initialsOf('  Anna   Kowal  ')).toBe('AK');
  });
});

describe('isExportableStatus', () => {
  it('odwołane nie trafiają do feedu', () => {
    expect(isExportableStatus('CANCELLED')).toBe(false);
  });

  it('pozostałe statusy trafiają', () => {
    expect(isExportableStatus('PENDING')).toBe(true);
    expect(isExportableStatus('CONFIRMED')).toBe(true);
    expect(isExportableStatus('COMPLETED')).toBe(true);
  });
});

describe('appointmentToIcsEvent', () => {
  it('składa tytuł z klientki, usługi i inicjałów pracownicy', () => {
    expect(appointmentToIcsEvent(appt()).summary)
      .toBe('Maria Nowak — Manicure hybrydowy (AK)');
  });

  it('bez przypisanej pracownicy nie dokłada pustego nawiasu', () => {
    const summary = appointmentToIcsEvent(appt({ employee: null })).summary;
    expect(summary).toBe('Maria Nowak — Manicure hybrydowy');
    expect(summary).not.toContain('()');
  });

  it('wizyta z zewnątrz używa clientName i clientPhone', () => {
    const e = appointmentToIcsEvent(appt({
      user: null, clientName: 'Ewa Zewnętrzna', clientPhone: '600300400',
    }));
    expect(e.summary).toContain('Ewa Zewnętrzna');
    expect(e.description).toContain('600300400');
  });

  it('DTEND liczy się z customDurationMinutes, gdy jest ustawione', () => {
    const e = appointmentToIcsEvent(appt({ customDurationMinutes: 90 }));
    expect(e.end.getTime() - e.start.getTime()).toBe(90 * 60_000);
  });

  it('DTEND liczy się z czasu usługi, gdy nie ma nadpisania', () => {
    const e = appointmentToIcsEvent(appt());
    expect(e.end.getTime() - e.start.getTime()).toBe(60 * 60_000);
  });

  it('UID jest stabilny i zbudowany z identyfikatora wizyty', () => {
    expect(appointmentToIcsEvent(appt()).uid)
      .toBe('appointment-abc@kosmetologwiktoriacwik.pl');
  });

  it('brak telefonu nie zostawia pustej etykiety w opisie', () => {
    const e = appointmentToIcsEvent(appt({ user: { name: 'Maria Nowak', phone: null } }));
    expect(e.description).not.toContain('Telefon:');
  });

  it('adres bierze się z lokalizacji zapisanej przy rezerwacji', () => {
    expect(appointmentToIcsEvent(appt()).location).toBe('ul. Testowa 1, Żywiec');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/calendar-feed/calendar-feed.service.test.ts`
Expected: FAIL — nie da się rozwiązać importu `./calendar-feed.service`.

- [ ] **Step 3: Dodaj model do schematu**

W `apps/server/prisma/schema.prisma` dopisz na końcu pliku:

```prisma
model CalendarFeed {
  id             String    @id @default(cuid())
  token          String    @unique
  createdAt      DateTime  @default(now())
  lastAccessedAt DateTime?
  accessCount    Int       @default(0)
}
```

- [ ] **Step 4: Utwórz migrację**

Utwórz `apps/server/prisma/migrations/20260831120000_add_calendar_feed/migration.sql`:

```sql
-- Subskrypcja ICS: jeden wiersz z tokenem dostępowym do feedu wizyt.
CREATE TABLE "CalendarFeed" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarFeed_token_key" ON "CalendarFeed"("token");
```

**Nie uruchamiaj `prisma migrate dev` ani `migrate deploy`** — migracja pojedzie na produkcję przez `deploy.sh` w osobnym tasku. Uruchom natomiast `pnpm prisma generate`, żeby klient Prismy poznał nowy model.

- [ ] **Step 5: Write the implementation**

Utwórz `apps/server/src/modules/calendar-feed/calendar-feed.service.ts`:

```ts
import { randomBytes } from 'crypto';
import { prisma } from '../../config/prisma';
import { buildIcs, type IcsEvent } from './ics';

const WINDOW_DAYS_BACK = 30;
const WINDOW_DAYS_FORWARD = 180;
const UID_DOMAIN = 'kosmetologwiktoriacwik.pl';
const CALENDAR_NAME = 'COSMO — wizyty';

export interface FeedAppointment {
  id: string;
  date: Date;
  status: string;
  customDurationMinutes: number | null;
  finalPrice: unknown;
  clientName: string | null;
  clientPhone: string | null;
  locationAddressAtBooking: string | null;
  updatedAt: Date;
  service: { name: string; durationMinutes: number };
  employee: { name: string } | null;
  user: { name: string; phone: string | null } | null;
}

/** Inicjały pracownicy do tytułu wydarzenia, np. „Anna Kowal" → „AK". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Odwołana wizyta znika z kalendarza przy najbliższym odświeżeniu. */
export function isExportableStatus(status: string): boolean {
  return status !== 'CANCELLED';
}

export function appointmentToIcsEvent(a: FeedAppointment): IcsEvent {
  const clientName = a.user?.name ?? a.clientName ?? 'Klientka';
  const phone = a.user?.phone ?? a.clientPhone ?? null;
  const minutes = a.customDurationMinutes ?? a.service.durationMinutes;
  const suffix = a.employee ? ` (${initialsOf(a.employee.name)})` : '';

  const descriptionParts: string[] = [];
  if (phone) descriptionParts.push(`Telefon: ${phone}`);
  descriptionParts.push(`Cena: ${String(a.finalPrice)} zł`);
  descriptionParts.push(`Status: ${a.status}`);

  return {
    uid: `appointment-${a.id}@${UID_DOMAIN}`,
    start: new Date(a.date),
    end: new Date(a.date.getTime() + minutes * 60_000),
    summary: `${clientName} — ${a.service.name}${suffix}`,
    description: descriptionParts.join('\n'),
    location: a.locationAddressAtBooking ?? undefined,
    lastModified: a.updatedAt,
  };
}

const newToken = () => randomBytes(32).toString('base64url');

export const getOrCreateFeed = async () => {
  const existing = await prisma.calendarFeed.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return await prisma.calendarFeed.create({ data: { token: newToken() } });
};

export const regenerateToken = async () => {
  const feed = await getOrCreateFeed();
  // Nadpisanie tokenu unieważnia stary adres natychmiast; historia dostępu
  // zeruje się razem z nim, bo dotyczyła poprzedniego linku.
  return await prisma.calendarFeed.update({
    where: { id: feed.id },
    data: { token: newToken(), lastAccessedAt: null, accessCount: 0 },
  });
};

/** Zwraca treść pliku ICS albo null, gdy token jest nieznany. */
export const buildFeedForToken = async (token: string): Promise<string | null> => {
  const feed = await prisma.calendarFeed.findUnique({ where: { token } });
  if (!feed) return null;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - WINDOW_DAYS_BACK);
  const to = new Date(now);
  to.setDate(to.getDate() + WINDOW_DAYS_FORWARD);

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: from, lte: to },
      status: { not: 'CANCELLED' },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true, date: true, status: true, customDurationMinutes: true,
      finalPrice: true, clientName: true, clientPhone: true,
      locationAddressAtBooking: true, updatedAt: true,
      service: { select: { name: true, durationMinutes: true } },
      employee: { select: { name: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  await prisma.calendarFeed.update({
    where: { id: feed.id },
    data: { lastAccessedAt: new Date(), accessCount: { increment: 1 } },
  });

  const events = (appointments as unknown as FeedAppointment[])
    .filter((a) => isExportableStatus(a.status))
    .map(appointmentToIcsEvent);

  return buildIcs(events, CALENDAR_NAME);
};
```

- [ ] **Step 6: Run tests and generate the client**

Run: `pnpm prisma generate`
Expected: `Generated Prisma Client`.

Run: `pnpm vitest run src/modules/calendar-feed/`
Expected: PASS — 8 testów generatora + 12 testów serwisu.

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 7: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations apps/server/src/modules/calendar-feed/calendar-feed.service.ts apps/server/src/modules/calendar-feed/calendar-feed.service.test.ts
git commit -m "feat(kalendarz): model i serwis subskrypcji ICS wizyt"
```

---

### Task 3: Kontroler, router i montaż trasy

**Files:**
- Create: `apps/server/src/modules/calendar-feed/calendar-feed.controller.ts`
- Create: `apps/server/src/modules/calendar-feed/calendar-feed.router.ts`
- Modify: `apps/server/src/app.ts` (import i montaż obok pozostałych routerów, przy linii ~117)

**Interfaces:**
- Consumes: `getOrCreateFeed`, `regenerateToken`, `buildFeedForToken` z Taska 2.
- Produces: trasy `GET /api/calendar-feed/:token/wizyty.ics` (publiczna), `GET /api/calendar-feed/config` i `POST /api/calendar-feed/regenerate` (admin).

- [ ] **Step 1: Utwórz kontroler**

Utwórz `apps/server/src/modules/calendar-feed/calendar-feed.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { getOrCreateFeed, regenerateToken, buildFeedForToken } from './calendar-feed.service';

export const handleGetConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await getOrCreateFeed();
    res.json({
      token: feed.token,
      lastAccessedAt: feed.lastAccessedAt,
      accessCount: feed.accessCount,
    });
  } catch (err) {
    next(err);
  }
};

export const handleRegenerate = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await regenerateToken();
    res.json({ token: feed.token, lastAccessedAt: null, accessCount: 0 });
  } catch (err) {
    next(err);
  }
};

export const handleFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Token jest poświadczeniem — nie może trafić do żadnego logu.
    const ics = await buildFeedForToken(req.params.token);
    if (ics === null) {
      // 404, a nie 401: odpowiedź nie potwierdza, czy jakikolwiek token istnieje.
      res.status(404).json({ status: 'error', message: 'Nie znaleziono' });
      return;
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(ics);
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Utwórz router**

Utwórz `apps/server/src/modules/calendar-feed/calendar-feed.router.ts`:

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { handleGetConfig, handleRegenerate, handleFeed } from './calendar-feed.controller';

const router = Router();

// Trasa publiczna: Apple odpytując subskrypcję nie wysyła nagłówka Authorization,
// więc token w ścieżce jest jedynym poświadczeniem. Musi być zadeklarowana przed
// trasami panelu, ale sama nie przechodzi przez authenticate.
router.get('/:token/wizyty.ics', handleFeed);

router.get('/config', authenticate, requireAdmin, handleGetConfig);
router.post('/regenerate', authenticate, requireAdmin, handleRegenerate);

export default router;
```

- [ ] **Step 3: Zamontuj router w app.ts**

Dopisz import obok pozostałych importów routerów:

```ts
import calendarFeedRouter from './modules/calendar-feed/calendar-feed.router';
```

i montaż obok `app.use('/api/external-calendar', externalCalendarRouter);`:

```ts
app.use('/api/calendar-feed', calendarFeedRouter);
```

Uwaga na kolejność w routerze: Express dopasowuje trasy po kolei. `/:token/wizyty.ics` ma dwa segmenty, a `/config` jeden, więc nie kolidują — ale gdyby ktoś kiedyś dodał `/:token`, przechwyciłby `/config`.

- [ ] **Step 4: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm test`
Expected: cała sada testów backendu przechodzi.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/calendar-feed/calendar-feed.controller.ts apps/server/src/modules/calendar-feed/calendar-feed.router.ts apps/server/src/app.ts
git commit -m "feat(kalendarz): trasy subskrypcji ICS wizyt"
```

---

### Task 4: Sekcja eksportu w ustawieniach

**Files:**
- Modify: `apps/web/src/api/external-calendar.api.ts` (dwa nowe wywołania)
- Modify: `apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx` (sekcja eksportu)

**Interfaces:**
- Consumes: trasy `/calendar-feed/config` i `/calendar-feed/regenerate` z Taska 3.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Dodaj wywołania API**

W `apps/web/src/api/external-calendar.api.ts` dopisz interfejs i dwie metody:

```ts
export interface CalendarFeedConfig {
  token: string;
  lastAccessedAt: string | null;
  accessCount: number;
}
```

oraz wewnątrz obiektu `externalCalendarApi`:

```ts
  getFeedConfig: (): Promise<CalendarFeedConfig> =>
    api.get('/calendar-feed/config').then((r: any) => r.data),
  regenerateFeedToken: (): Promise<CalendarFeedConfig> =>
    api.post('/calendar-feed/regenerate').then((r: any) => r.data),
```

- [ ] **Step 2: Dodaj sekcję eksportu do modalu**

Plik ma już zaimportowane `useQuery`, `useMutation`, `useQueryClient` oraz domyślny `externalCalendarApi`, a komponent przyjmuje prop `open: boolean`. Dochodzi więc **wyłącznie import typu** — dopisz go do istniejącej linii importu API:

```ts
import externalCalendarApi, { type CalendarFeedConfig } from '@/api/external-calendar.api';
```

Wewnątrz komponentu, obok istniejących zapytań:

```ts
  const { data: feed, refetch: refetchFeed } = useQuery<CalendarFeedConfig>({
    queryKey: ['calendar-feed-config'],
    queryFn: () => externalCalendarApi.getFeedConfig(),
    enabled: open,
  });

  const { mutate: regenerate, isPending: isRegenerating } = useMutation({
    mutationFn: () => externalCalendarApi.regenerateFeedToken(),
    onSuccess: () => { void refetchFeed(); },
  });

  // Adres składamy z origin przeglądarki — frontend i API dzielą domenę (nginx
  // proxuje /api), więc nie potrzeba zmiennej środowiskowej, która mogłaby się
  // rozjechać z rzeczywistym adresem wdrożenia.
  const feedHttps = feed
    ? `${window.location.origin}/api/calendar-feed/${feed.token}/wizyty.ics`
    : '';
  const feedWebcal = feedHttps.replace(/^https?:/, 'webcal:');
```

I sekcja w JSX, pod istniejącą częścią importu:

```tsx
        <section className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold">Eksport wizyt do kalendarza Apple</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Subskrybuj ten adres w Kalendarzu, żeby wizyty z COSMO pojawiały się w telefonie.
            Zmiany terminów i odwołania propagują się same.
          </p>

          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <strong>Ten link działa jak hasło.</strong> Kto go zna, widzi nazwiska i telefony
            klientek. Nie wysyłaj go nikomu i nie publikuj.
          </div>

          {feed && (
            <>
              <label className="mt-3 block text-xs font-medium">
                Adres subskrypcji
                <input
                  readOnly
                  value={feedHttps}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-1 w-full rounded-lg border border-border bg-accent/40 px-2 py-1.5 text-xs"
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(feedHttps)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-accent"
                >
                  Kopiuj adres
                </button>
                <a
                  href={feedWebcal}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Otwórz w Kalendarzu
                </a>
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => {
                    if (window.confirm('Wygenerować nowy link? Stary natychmiast przestanie działać, a kalendarz na telefonie trzeba będzie zasubskrybować ponownie.')) {
                      regenerate();
                    }
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  Wygeneruj nowy link
                </button>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Ostatnio pobrany przez Apple:{' '}
                {feed.lastAccessedAt
                  ? new Date(feed.lastAccessedAt).toLocaleString('pl-PL')
                  : 'jeszcze nigdy'}
                {feed.accessCount > 0 && ` (${feed.accessCount} razy)`}
              </p>

              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-medium">Jak to dodać i jak często się odświeża</summary>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <p>
                    <strong>iPhone:</strong> Ustawienia → Aplikacje → Kalendarz → Konta →
                    Dodaj konto → Inne → Dodaj subskrybowany kalendarz, wklej adres.
                  </p>
                  <p>
                    <strong>Mac:</strong> Kalendarz → Plik → Nowa subskrypcja kalendarza, wklej adres.
                  </p>
                  <p>
                    <strong>Najważniejsze:</strong> po dodaniu ustaw częstotliwość odświeżania na
                    5 lub 15 minut. To ustawienie jest po stronie telefonu, a domyślnie bywa
                    ustawione nawet na raz w tygodniu — wtedy wizyty pojawiają się z dużym
                    opóźnieniem i wygląda to na awarię. Na iPhonie znajdziesz je przy
                    subskrybowanym kalendarzu, na Macu w Kalendarz → Ustawienia → Konta.
                  </p>
                </div>
              </details>
            </>
          )}
        </section>
```

- [ ] **Step 3: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm build`
Expected: build przechodzi, audyt SEO zdany.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/external-calendar.api.ts apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx
git commit -m "feat(kalendarz): sekcja eksportu wizyt w ustawieniach kalendarza Apple"
```

---

### Task 5: Weryfikacja i pełny deploy

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże problem.

**Interfaces:**
- Consumes: wszystko z Tasków 1–4.
- Produces: działająca subskrypcja na produkcji.

- [ ] **Step 1: Uruchom aplikację lokalnie**

Z katalogu `cosmo-app`: `pnpm dev`. Zaloguj się jako admin, otwórz `/admin/wizyty`, kliknij ikonę ustawień kalendarza Apple w toolbarze.

Jeśli lokalna baza nie ma jeszcze tabeli, zastosuj migrację lokalnie: `cd apps/server && pnpm prisma migrate dev`.

- [ ] **Step 2: Sprawdź feed w przeglądarce**

Skopiuj adres z sekcji eksportu i otwórz go w nowej karcie. Oczekiwane: przeglądarka pobiera plik albo pokazuje tekst zaczynający się od `BEGIN:VCALENDAR`, z wizytami z bazy.

- [ ] **Step 3: Sprawdź nieznany token**

Zmień kilka znaków w tokenie w adresie. Oczekiwane: `404`, bez żadnej informacji o tym, czy token istnieje.

- [ ] **Step 4: Sprawdź polskie znaki**

Znajdź w pobranym pliku wizytę z polskimi znakami w nazwisku albo nazwie usługi. Oczekiwane: znaki wyświetlają się poprawnie, a jeśli linia została zawinięta, kontynuacja zaczyna się spacją i żaden znak nie jest rozcięty.

- [ ] **Step 5: Sprawdź licznik pobrań**

Odśwież adres feedu kilka razy, potem zamknij i otwórz modal ustawień. Oczekiwane: „Ostatnio pobrany przez Apple" pokazuje świeżą datę, a licznik rośnie.

- [ ] **Step 6: Sprawdź unieważnienie**

Kliknij „Wygeneruj nowy link", potwierdź. Oczekiwane: adres się zmienia, stary zwraca `404`, licznik wraca do zera.

- [ ] **Step 7: Deploy**

Zmiana obejmuje backend i migrację, więc pełny deploy:

```bash
./deploy.sh
```

- [ ] **Step 8: Sprawdź na produkcji**

Otwórz `https://kosmetologwiktoriacwik.pl/admin/wizyty`, twarde odświeżenie, wejdź w ustawienia kalendarza Apple i pobierz adres. Otwórz adres `https://` w przeglądarce — ma zwrócić plik ICS.

- [ ] **Step 9: Subskrybuj na telefonie**

Dodaj subskrypcję na iPhonie zgodnie z instrukcją w modalu i **ustaw odświeżanie na 5 lub 15 minut**. Sprawdź, że wizyty się pojawiły.

- [ ] **Step 10: Sprawdź propagację zmian**

Przenieś jedną wizytę na inną godzinę w COSMO, poczekaj na odświeżenie. Oczekiwane: wydarzenie zmienia godzinę, a nie duplikuje się. Następnie odwołaj wizytę — po odświeżeniu ma zniknąć z kalendarza.
