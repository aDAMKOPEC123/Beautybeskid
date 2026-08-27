# Kalendarz Apple + blokady godzin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin widzi w kalendarzu wizyt swoje prywatne wydarzenia z kalendarza Apple (szare tło, synchronizacja co 15 min, zero wpływu na zapisy) i może kliknięciem w godzinę utworzyć blokadę, która realnie uniemożliwia klientkom zapis.

**Architecture:** Dwie niezależne funkcje. (1) Backendowy scheduler pobiera publiczny link `.ics` z iCloud, parsuje przez `node-ical`, cache'uje wystąpienia w tabeli `ExternalCalendarEvent`; frontend rysuje je jako tłowe eventy FullCalendar. (2) Nowa tabela `CalendarBlock` (zakres czasu + zasięg: cały salon albo wybrani pracownicy) wpięta w `getAvailabilityForDuration()`, przez co blokady działają automatycznie w kreatorze rezerwacji, kalendarzu miesięcznym i przy przekładaniu wizyt.

**Tech Stack:** Node 20 / Express 5 / Prisma / PostgreSQL / Socket.IO / `node-ical` (nowa zależność) po stronie serwera; React 19 / FullCalendar v6 (`resourceTimeGrid`) / TanStack Query / Tailwind po stronie web. Testy: vitest.

Spec: `docs/superpowers/specs/2026-08-27-kalendarz-apple-i-blokady-design.md`

## Global Constraints

- Wszystkie polecenia uruchamiaj z katalogu `cosmo-app/` (monorepo root), chyba że krok mówi inaczej.
- Wydarzenia z kalendarza Apple **nigdy** nie wpływają na dostępność terminów. Model `ExternalCalendarEvent` nie może być odczytywany w `employees.service.ts` ani `appointments.service.ts`.
- Blokady **nigdy** nie kasują, nie odwołują ani nie przekładają istniejących wizyt — wstrzymują tylko nowe zapisy.
- Teksty w UI po polsku, z polskimi znakami. Komunikaty błędów backendu też po polsku (`AppError('...', 400)`).
- Testy vitest w tym repo są czysto jednostkowe — nie dotykają bazy. Każdą logikę, którą testujemy, wydzielamy do czystej funkcji przyjmującej dane jako argumenty (wzór: `resolveEmployeeBlocks` w `employees.service.ts:332` i jej test `employees.weekslots.test.ts`).
- Backend: serwisy rzucają `AppError` z `middleware/error.middleware`, kontrolery mają kształt `try { ... } catch (err) { next(err) }`.
- Frontend: pliki API w `src/api/<moduł>.api.ts` eksportują domyślnie obiekt metod zwracających `r.data` (wzór: `happy-hours.api.ts`).
- Commituj po każdym zadaniu. Nie pushuj — deploy jest osobnym, ostatnim zadaniem.

## File Structure

**Tworzone — backend**
- `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.ts` — czyste funkcje decydujące, czy slot jest zablokowany (jedyna logika objęta testami)
- `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.test.ts`
- `apps/server/src/modules/calendar-blocks/calendar-blocks.service.ts` — dostęp do bazy + walidacja
- `apps/server/src/modules/calendar-blocks/calendar-blocks.controller.ts`
- `apps/server/src/modules/calendar-blocks/calendar-blocks.router.ts`
- `apps/server/src/modules/external-calendar/external-calendar.parser.ts` — czysta funkcja `parseIcs()` (bez sieci, bez bazy)
- `apps/server/src/modules/external-calendar/external-calendar.parser.test.ts`
- `apps/server/src/modules/external-calendar/external-calendar.service.ts` — konfiguracja źródła, pobranie pliku, zapis do bazy, scheduler
- `apps/server/src/modules/external-calendar/external-calendar.controller.ts`
- `apps/server/src/modules/external-calendar/external-calendar.router.ts`

**Tworzone — frontend**
- `apps/web/src/api/calendar-blocks.api.ts`
- `apps/web/src/api/external-calendar.api.ts`
- `apps/web/src/components/calendar/BlockHoursModal.tsx` — okno tworzenia blokady
- `apps/web/src/components/calendar/AppleCalendarOverlay.tsx` — render-prop dostarczający tłowe eventy Apple (wzór: `HappyHourOverlay.tsx`)
- `apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx` — wklejenie linku, status synchronizacji

**Modyfikowane**
- `apps/server/prisma/schema.prisma` — trzy nowe modele + pola zwrotne w `User` i `Employee`
- `apps/server/src/modules/employees/employees.service.ts:339-421` — wpięcie blokad w `getAvailabilityForDuration`
- `apps/server/src/app.ts` — montaż dwóch routerów
- `apps/server/src/index.ts` — start schedulera synchronizacji
- `apps/server/package.json` — zależność `node-ical`
- `apps/web/src/components/calendar/CalendarView.tsx` — warstwa blokad, warstwa Apple, pozycja w menu slotu, popover usuwania, przyciski w toolbarze
- `apps/web/src/pages/employee/Schedule.tsx` — plakietka blokady przy dniu (tylko odczyt)

**Odstępstwo od spec:** panel konfiguracji linku Apple ląduje w modalu otwieranym z toolbara kalendarza (`AppleCalendarSettingsModal`), a nie w `/admin/praca`. `Work.tsx` okazało się widokiem dziennym klientów, nie ustawieniami — ustawienie kalendarza należy tam, gdzie kalendarz. Zadanie 12 aktualizuje spec.

---

### Task 1: Migracja bazy

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

**Interfaces:**
- Produces: modele Prisma `CalendarBlock`, `ExternalCalendarSource`, `ExternalCalendarEvent` — używane przez wszystkie kolejne zadania backendowe.

- [ ] **Step 1: Dopisz modele na końcu `schema.prisma`**

```prisma
model CalendarBlock {
  id           String     @id @default(cuid())
  startsAt     DateTime
  endsAt       DateTime
  reason       String?
  appliesToAll Boolean    @default(true)
  employees    Employee[] @relation("CalendarBlockEmployees")
  createdById  String?
  createdBy    User?      @relation("CalendarBlockCreatedBy", fields: [createdById], references: [id])
  createdAt    DateTime   @default(now())

  @@index([startsAt, endsAt])
}

model ExternalCalendarSource {
  id                  String                  @id @default(cuid())
  name                String                  @default("Kalendarz Apple")
  url                 String
  isEnabled           Boolean                 @default(true)
  syncIntervalMinutes Int                     @default(15)
  lastSyncedAt        DateTime?
  lastSyncError       String?
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  events              ExternalCalendarEvent[]
}

model ExternalCalendarEvent {
  id       String                 @id @default(cuid())
  sourceId String
  source   ExternalCalendarSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  uid      String
  title    String
  startsAt DateTime
  endsAt   DateTime
  isAllDay Boolean                @default(false)
  location String?

  @@unique([sourceId, uid, startsAt])
  @@index([startsAt, endsAt])
}
```

- [ ] **Step 2: Dodaj pola zwrotne relacji**

W modelu `User` (blok relacji ok. linii 252–275), dopisz w liście relacji:

```prisma
  calendarBlocks              CalendarBlock[]                  @relation("CalendarBlockCreatedBy")
```

W modelu `Employee` (`apps/server/prisma/schema.prisma:561-578`), po linii `happyHours ...`:

```prisma
  calendarBlocks CalendarBlock[]          @relation("CalendarBlockEmployees")
```

- [ ] **Step 3: Uruchom migrację**

```bash
cd apps/server && npx prisma migrate dev --name add_calendar_blocks_and_external_calendar
```

Oczekiwane: migracja tworzy 3 tabele + tabelę łączącą `_CalendarBlockEmployees`, klient Prisma regeneruje się automatycznie.

- [ ] **Step 4: Sprawdź, że backend się kompiluje**

```bash
cd apps/server && pnpm build
```

Oczekiwane: sukces, bez błędów TypeScript.

- [ ] **Step 5: Commit**

```bash
git add apps/server/prisma
git commit -m "feat(db): modele CalendarBlock i ExternalCalendarSource/Event"
```

---

### Task 2: Czyste reguły blokowania slotów

**Files:**
- Create: `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.ts`
- Test: `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.test.ts`

**Interfaces:**
- Produces:
  - `interface BlockLike { startsAt: Date; endsAt: Date; appliesToAll: boolean; employees: { id: string }[] }`
  - `blockAppliesToEmployee(block: BlockLike, employeeId: string): boolean`
  - `isSlotBlocked(slotStart: Date, slotEnd: Date, employeeId: string, blocks: BlockLike[]): boolean`

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { blockAppliesToEmployee, isSlotBlocked, type BlockLike } from './calendar-blocks.rules';

const at = (h: number, m = 0) => new Date(2026, 8, 10, h, m, 0, 0);

const salonBlock: BlockLike = {
  startsAt: at(12), endsAt: at(14), appliesToAll: true, employees: [],
};
const annaBlock: BlockLike = {
  startsAt: at(12), endsAt: at(14), appliesToAll: false, employees: [{ id: 'anna' }],
};

describe('blockAppliesToEmployee', () => {
  it('blokada całego salonu dotyczy każdego pracownika', () => {
    expect(blockAppliesToEmployee(salonBlock, 'anna')).toBe(true);
    expect(blockAppliesToEmployee(salonBlock, 'basia')).toBe(true);
  });

  it('blokada per-pracownik dotyczy tylko wskazanych', () => {
    expect(blockAppliesToEmployee(annaBlock, 'anna')).toBe(true);
    expect(blockAppliesToEmployee(annaBlock, 'basia')).toBe(false);
  });
});

describe('isSlotBlocked', () => {
  it('blokada całego salonu wycina pokrywany slot', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'basia', [salonBlock])).toBe(true);
  });

  it('blokada per-pracownik nie rusza slotu innego pracownika', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'basia', [annaBlock])).toBe(false);
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'anna', [annaBlock])).toBe(true);
  });

  it('blokada kończąca się dokładnie w momencie startu slotu go nie wycina', () => {
    expect(isSlotBlocked(at(14), at(15), 'anna', [salonBlock])).toBe(false);
  });

  it('slot kończący się dokładnie w momencie startu blokady nie jest wycinany', () => {
    expect(isSlotBlocked(at(11), at(12), 'anna', [salonBlock])).toBe(false);
  });

  it('częściowe nachodzenie wycina cały slot', () => {
    expect(isSlotBlocked(at(11, 30), at(12, 30), 'anna', [salonBlock])).toBe(true);
    expect(isSlotBlocked(at(13, 30), at(14, 30), 'anna', [salonBlock])).toBe(true);
  });

  it('slot obejmujący całą blokadę jest wycinany', () => {
    expect(isSlotBlocked(at(11), at(15), 'anna', [salonBlock])).toBe(true);
  });

  it('brak blokad oznacza slot wolny', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'anna', [])).toBe(false);
  });
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/calendar-blocks/calendar-blocks.rules.test.ts
```

Oczekiwane: FAIL — `Failed to resolve import "./calendar-blocks.rules"`.

- [ ] **Step 3: Napisz minimalną implementację**

Utwórz `apps/server/src/modules/calendar-blocks/calendar-blocks.rules.ts`:

```ts
// Czyste reguły blokad — bez Prismy, bez sieci. Testowalne jednostkowo.

export interface BlockLike {
  startsAt: Date;
  endsAt: Date;
  appliesToAll: boolean;
  employees: { id: string }[];
}

export function blockAppliesToEmployee(block: BlockLike, employeeId: string): boolean {
  if (block.appliesToAll) return true;
  return block.employees.some((e) => e.id === employeeId);
}

export function isSlotBlocked(
  slotStart: Date,
  slotEnd: Date,
  employeeId: string,
  blocks: BlockLike[],
): boolean {
  return blocks.some(
    (b) =>
      blockAppliesToEmployee(b, employeeId) &&
      slotStart < b.endsAt &&
      slotEnd > b.startsAt,
  );
}
```

- [ ] **Step 4: Uruchom test i potwierdź, że przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/calendar-blocks/calendar-blocks.rules.test.ts
```

Oczekiwane: PASS, 9 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/calendar-blocks
git commit -m "feat(blokady): czyste reguły nakładania blokad na sloty + testy"
```

---

### Task 3: API blokad (serwis, kontroler, router)

**Files:**
- Create: `apps/server/src/modules/calendar-blocks/calendar-blocks.service.ts`
- Create: `apps/server/src/modules/calendar-blocks/calendar-blocks.controller.ts`
- Create: `apps/server/src/modules/calendar-blocks/calendar-blocks.router.ts`
- Modify: `apps/server/src/app.ts`

**Interfaces:**
- Consumes: modele z Task 1.
- Produces:
  - `listBlocks(from: string, to: string)` → blokady z dołączonym `employees: { id, name }[]`
  - `createBlock(input: CreateBlockInput, createdById?: string)`, gdzie `CreateBlockInput = { startsAt: string; endsAt: string; reason?: string; appliesToAll: boolean; employeeIds?: string[] }`
  - `deleteBlock(id: string)`
  - Endpointy: `GET/POST /api/calendar-blocks`, `DELETE /api/calendar-blocks/:id`

- [ ] **Step 1: Napisz serwis**

Utwórz `apps/server/src/modules/calendar-blocks/calendar-blocks.service.ts`:

```ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export interface CreateBlockInput {
  startsAt: string;
  endsAt: string;
  reason?: string;
  appliesToAll: boolean;
  employeeIds?: string[];
}

const blockInclude = {
  employees: { select: { id: true, name: true } },
} as const;

export const listBlocks = async (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new AppError('Nieprawidłowy zakres dat', 400);
  }
  return await prisma.calendarBlock.findMany({
    where: { startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
    include: blockInclude,
    orderBy: { startsAt: 'asc' },
  });
};

export const createBlock = async (input: CreateBlockInput, createdById?: string) => {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new AppError('Nieprawidłowa data blokady', 400);
  }
  if (endsAt <= startsAt) {
    throw new AppError('Godzina zakończenia musi być późniejsza niż rozpoczęcia', 400);
  }

  const employeeIds = input.employeeIds ?? [];
  if (!input.appliesToAll && employeeIds.length === 0) {
    throw new AppError('Wybierz co najmniej jednego pracownika', 400);
  }

  return await prisma.calendarBlock.create({
    data: {
      startsAt,
      endsAt,
      reason: input.reason?.trim() || null,
      appliesToAll: input.appliesToAll,
      createdById: createdById ?? null,
      ...(input.appliesToAll
        ? {}
        : { employees: { connect: employeeIds.map((id) => ({ id })) } }),
    },
    include: blockInclude,
  });
};

export const deleteBlock = async (id: string) => {
  const block = await prisma.calendarBlock.findUnique({ where: { id } });
  if (!block) throw new AppError('Nie znaleziono blokady', 404);
  await prisma.calendarBlock.delete({ where: { id } });
  return { success: true };
};
```

- [ ] **Step 2: Napisz kontroler**

Utwórz `apps/server/src/modules/calendar-blocks/calendar-blocks.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { listBlocks, createBlock, deleteBlock } from './calendar-blocks.service';

export const handleListBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ message: 'Wymagane parametry from i to' });
      return;
    }
    res.json(await listBlocks(from, to));
  } catch (err) {
    next(err);
  }
};

export const handleCreateBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    const block = await createBlock(req.body, userId);
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
};

export const handleDeleteBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await deleteBlock(req.params.id));
  } catch (err) {
    next(err);
  }
};
```

Jeśli w repo istnieje typ rozszerzonego `Request` z użytkownikiem (sprawdź `apps/server/src/middleware/auth.middleware.ts` — jak inne kontrolery sięgają po `req.user`), użyj go zamiast `(req as any)`.

- [ ] **Step 3: Napisz router**

Utwórz `apps/server/src/modules/calendar-blocks/calendar-blocks.router.ts`:

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requireEmployee } from '../../middleware/employee.middleware';
import {
  handleListBlocks,
  handleCreateBlock,
  handleDeleteBlock,
} from './calendar-blocks.controller';

const router = Router();

// Podgląd — pracownik lub admin
router.get('/', authenticate, requireEmployee, handleListBlocks);

// Zarządzanie — tylko admin
router.post('/', authenticate, requireAdmin, handleCreateBlock);
router.delete('/:id', authenticate, requireAdmin, handleDeleteBlock);

export default router;
```

- [ ] **Step 4: Zamontuj router w `app.ts`**

W `apps/server/src/app.ts` dopisz import obok pozostałych (ok. linii 49):

```ts
import calendarBlocksRouter from './modules/calendar-blocks/calendar-blocks.router';
```

i montaż obok pozostałych `app.use` (ok. linii 113):

```ts
app.use('/api/calendar-blocks', calendarBlocksRouter);
```

- [ ] **Step 5: Zweryfikuj kompilację i istniejące testy**

```bash
cd apps/server && pnpm build && pnpm test
```

Oczekiwane: build OK, wszystkie testy przechodzą (w tym 9 z Task 2).

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/calendar-blocks apps/server/src/app.ts
git commit -m "feat(blokady): API listowania, tworzenia i usuwania blokad"
```

---

### Task 4: Blokady wycinają terminy w dostępności

**Files:**
- Modify: `apps/server/src/modules/employees/employees.service.ts:339-421`

**Interfaces:**
- Consumes: `isSlotBlocked`, `BlockLike` z Task 2; model `CalendarBlock` z Task 1.
- Produces: `getAvailability()` i `getAvailabilityForDuration()` zwracają `available: false` dla slotów objętych blokadą — bez zmian w sygnaturach.

- [ ] **Step 1: Dodaj import na górze pliku**

W `apps/server/src/modules/employees/employees.service.ts`, po linii 3 (`import bcrypt ...`):

```ts
import { isSlotBlocked, type BlockLike } from '../calendar-blocks/calendar-blocks.rules';
```

Import jest bezpieczny: `calendar-blocks.rules.ts` nie importuje niczego z Prismy ani z `employees.service`, więc nie powstaje cykl.

- [ ] **Step 2: Pobierz blokady w `getAvailabilityForDuration`**

W `getAvailabilityForDuration` (`employees.service.ts:339`), bezpośrednio po zapytaniu `existingAppointments` (kończy się na linii ~391), dopisz:

```ts
  // Blokady godzin — dotyczą całego salonu albo wskazanych pracowników.
  const calendarBlocks = (await prisma.calendarBlock.findMany({
    where: {
      startsAt: { lt: dayEnd },
      endsAt: { gt: normalized },
      OR: [
        { appliesToAll: true },
        { employees: { some: { id: employeeId } } },
      ],
    },
    include: { employees: { select: { id: true } } },
  })) as unknown as BlockLike[];
```

- [ ] **Step 3: Uwzględnij blokady przy wyznaczaniu dostępności slotu**

W pętli po slotach (`employees.service.ts:401-417`) zamień linię wyznaczającą dostępność. Było:

```ts
      slots.push({ time: `${hh}:${mm}`, available: !isPast && !isOccupied });
```

Ma być (dodaj też deklarację `isBlocked` tuż nad `const hh = ...`):

```ts
      const isBlocked = !isPast && isSlotBlocked(slotStart, slotEnd, employeeId, calendarBlocks);
      const hh = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const mm = (currentMinutes % 60).toString().padStart(2, '0');
      slots.push({ time: `${hh}:${mm}`, available: !isPast && !isOccupied && !isBlocked });
```

Uwaga na gałąź „bez wybranego pracownika” (`employees.service.ts:351-373`): rekurencyjnie sumuje dostępność po wszystkich kandydatach i sama nie potrzebuje zmian — blokady zadziałają w każdym wywołaniu potomnym. Jeśli blokada obejmuje cały salon, żaden kandydat nie zwróci wolnego slotu, więc slot zniknie także z widoku „dowolny pracownik”.

- [ ] **Step 4: Zweryfikuj build i testy**

```bash
cd apps/server && pnpm build && pnpm test
```

Oczekiwane: build OK, wszystkie testy przechodzą.

- [ ] **Step 5: Sprawdź ręcznie na działającym serwerze**

Uruchom `pnpm dev` w `cosmo-app/`, następnie w bazie utwórz jedną blokadę przez API (podmień token admina i datę na jutrzejszą):

```bash
curl -X POST http://localhost:3001/api/calendar-blocks \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN_ADMINA>" \
  -d '{"startsAt":"2026-09-10T12:00:00","endsAt":"2026-09-10T14:00:00","appliesToAll":true,"reason":"Lekarz"}'
```

Następnie pobierz dostępność na ten dzień:

```bash
curl "http://localhost:3001/api/employees/availability?date=2026-09-10&serviceId=<ID_USLUGI>"
```

Oczekiwane: sloty 12:00 i 13:00 (oraz każdy nachodzący na 12:00–14:00) mają `"available": false`.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/employees/employees.service.ts
git commit -m "feat(blokady): blokady wycinają terminy w dostępności"
```

---

### Task 5: Klient API blokad + rysowanie blokad w kalendarzu

**Files:**
- Create: `apps/web/src/api/calendar-blocks.api.ts`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: endpointy z Task 3.
- Produces:
  - `CalendarBlock` (typ TS) — używany przez Task 6, 7, 8
  - `calendarBlocksApi.list/create/remove`
  - `buildBlockEvents(blocks, employees, isResourceView)` w `CalendarView.tsx`
  - klucz zapytania TanStack Query: `['calendar-blocks', fromISO, toISO]`

- [ ] **Step 1: Utwórz klienta API**

Utwórz `apps/web/src/api/calendar-blocks.api.ts`:

```ts
import { api } from '@/lib/axios';

export interface CalendarBlock {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  appliesToAll: boolean;
  employees: { id: string; name: string }[];
}

export interface CreateCalendarBlockInput {
  startsAt: string;
  endsAt: string;
  reason?: string;
  appliesToAll: boolean;
  employeeIds?: string[];
}

const calendarBlocksApi = {
  list: (from: string, to: string): Promise<CalendarBlock[]> =>
    api.get('/calendar-blocks', { params: { from, to } }).then((r: any) => r.data),
  create: (data: CreateCalendarBlockInput): Promise<CalendarBlock> =>
    api.post('/calendar-blocks', data).then((r: any) => r.data),
  remove: (id: string) =>
    api.delete(`/calendar-blocks/${id}`).then((r: any) => r.data),
};

export default calendarBlocksApi;
```

- [ ] **Step 2: Dodaj budowanie eventów blokad w `CalendarView.tsx`**

W `apps/web/src/components/calendar/CalendarView.tsx` dopisz importy:

```ts
import calendarBlocksApi, { type CalendarBlock } from '@/api/calendar-blocks.api';
import { Lock } from 'lucide-react';
```

i funkcję pomocniczą pod `buildWorkingHourEvents` (po linii 66):

```ts
// Blokady godzin. W widoku zasobów każdy event musi mieć resourceId, więc blokadę
// „cały salon" powielamy na wszystkie kolumny; w widoku tygodnia wystarczy jeden event.
function buildBlockEvents(
  blocks: CalendarBlock[],
  employees: any[],
  isResourceView: boolean,
): EventInput[] {
  return blocks.flatMap((b) => {
    const base = {
      start: b.startsAt,
      end: b.endsAt,
      display: 'auto' as const,
      backgroundColor: '#374151',
      borderColor: '#1f2937',
      classNames: ['cosmo-calendar-block'],
      extendedProps: { calendarBlockId: b.id, block: b },
    };
    if (!isResourceView) return [{ ...base, id: `blk-${b.id}` }];

    const targetIds = b.appliesToAll
      ? employees.map((e: any) => e.id)
      : b.employees.map((e) => e.id);
    return targetIds.map((empId: string) => ({
      ...base,
      id: `blk-${b.id}-${empId}`,
      resourceId: empId,
    }));
  });
}
```

- [ ] **Step 3: Pobierz blokady dla widocznego zakresu**

Po zapytaniu `workDayResults` (ok. linii 127) dopisz:

```ts
  const { data: calendarBlocks = [] } = useQuery({
    queryKey: ['calendar-blocks', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => calendarBlocksApi.list(rangeStart.toISOString(), rangeEnd.toISOString()),
    staleTime: 60 * 1000,
  });
```

Zmienna `isResourceView` jest deklarowana dopiero na linii 239 — przenieś tę deklarację nad `workingHourEvents` (linia ~152), żeby dało się jej użyć w `useMemo` poniżej. Potem dopisz:

```ts
  const blockEvents = useMemo(
    () => buildBlockEvents(calendarBlocks, employees, isResourceView),
    [calendarBlocks, employees, isResourceView],
  );
```

- [ ] **Step 4: Dołóż warstwę do eventów kalendarza i wyrenderuj treść**

W `allEvents` (ok. linii 318) dopisz `...blockEvents` po `...workingHourEvents`.

W `eventContent` (linia 332), zaraz po linii `if (arg.event.extendedProps.isWorkingHours) return null;`, dopisz:

```ts
                    if (arg.event.extendedProps.calendarBlockId) {
                      const blk = arg.event.extendedProps.block as CalendarBlock;
                      return (
                        <div className="flex h-full items-start gap-1 px-1 py-0.5 text-white">
                          <Lock size={11} className="mt-0.5 shrink-0" />
                          <span className="truncate text-[10px] font-semibold leading-tight">
                            {blk.reason ?? 'Zablokowane'}
                          </span>
                        </div>
                      );
                    }
```

W `eventClick` (linia 357) dopisz na początku, żeby kliknięcie w blokadę nie próbowało otwierać karty klientki (obsługę popovera dokłada Task 7):

```ts
                    if (arg.event.extendedProps.calendarBlockId) return;
```

- [ ] **Step 5: Dodaj szrafurę CSS**

W `apps/web/src/index.css` (na końcu pliku) dopisz:

```css
/* Blokady godzin w kalendarzu admina */
.cosmo-calendar-block {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.12) 0px,
    rgba(255, 255, 255, 0.12) 4px,
    transparent 4px,
    transparent 8px
  );
  cursor: pointer;
}
```

- [ ] **Step 6: Zweryfikuj build frontendu**

```bash
cd apps/web && pnpm build
```

Oczekiwane: sukces.

- [ ] **Step 7: Sprawdź w przeglądarce**

Uruchom `pnpm dev` z `cosmo-app/`, zaloguj się jako admin, wejdź w `/admin/wizyty` → zakładka kalendarza, przejdź na dzień, w którym utworzyłeś blokadę w Task 4 krok 5.
Oczekiwane: ciemny szrafurowany prostokąt 12:00–14:00 z kłódką i napisem „Lekarz”, we wszystkich kolumnach pracowników.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/api/calendar-blocks.api.ts apps/web/src/components/calendar/CalendarView.tsx apps/web/src/index.css
git commit -m "feat(blokady): rysowanie blokad w kalendarzu admina"
```

---

### Task 6: Tworzenie blokady z menu slotu

**Files:**
- Create: `apps/web/src/components/calendar/BlockHoursModal.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `calendarBlocksApi`, `CalendarBlock` z Task 5.
- Produces: komponent `BlockHoursModal` o props:
  `{ open: boolean; onClose: () => void; prefill: { date: string; time?: string; employeeId?: string }; employees: any[]; appointments: any[] }`

- [ ] **Step 1: Napisz komponent modala**

Utwórz `apps/web/src/components/calendar/BlockHoursModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import calendarBlocksApi from '@/api/calendar-blocks.api';
import { Lock, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  prefill: { date: string; time?: string; employeeId?: string };
  employees: any[];
  appointments: any[];
}

// "13:30" + 60 → "14:30"
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function BlockHoursModal({ open, onClose, prefill, employees, appointments }: Props) {
  const qc = useQueryClient();
  const startTimeDefault = prefill.time ?? '09:00';

  const [date, setDate] = useState(prefill.date);
  const [from, setFrom] = useState(startTimeDefault);
  const [to, setTo] = useState(addMinutesToTime(startTimeDefault, 60));
  const [reason, setReason] = useState('');
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    prefill.employeeId ? [prefill.employeeId] : [],
  );
  const [error, setError] = useState<string | null>(null);

  const startsAt = `${date}T${from}:00`;
  const endsAt = `${date}T${to}:00`;

  // Wizyty kolidujące z zakresem — tylko ostrzeżenie, blokada ich nie rusza.
  const collidingCount = useMemo(() => {
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return appointments.filter((appt: any) => {
      if (appt.status === 'CANCELLED') return false;
      if (!appliesToAll && appt.employeeId && !employeeIds.includes(appt.employeeId)) return false;
      const aptStart = new Date(appt.date).getTime();
      const aptEnd = aptStart + (appt.service?.durationMinutes ?? 60) * 60_000;
      return aptStart < e && aptEnd > s;
    }).length;
  }, [appointments, startsAt, endsAt, appliesToAll, employeeIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      calendarBlocksApi.create({
        startsAt,
        endsAt,
        reason: reason.trim() || undefined,
        appliesToAll,
        employeeIds: appliesToAll ? undefined : employeeIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Nie udało się zapisać blokady');
    },
  });

  if (!open) return null;

  const submit = () => {
    setError(null);
    if (to <= from) {
      setError('Godzina zakończenia musi być późniejsza niż rozpoczęcia');
      return;
    }
    if (!appliesToAll && employeeIds.length === 0) {
      setError('Wybierz co najmniej jednego pracownika');
      return;
    }
    mutate();
  };

  const toggleEmployee = (id: string) =>
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} className="text-gray-700" />
          <h2 className="text-lg font-semibold">Zablokuj godziny</h2>
          <button className="ml-auto rounded-lg p-1 hover:bg-accent" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-sm">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>

        <div className="mb-3 flex gap-3">
          <label className="flex-1 text-sm">
            Od
            <input type="time" step={900} value={from} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex-1 text-sm">
            Do
            <input type="time" step={900} value={to} onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          </label>
        </div>

        <label className="mb-3 block text-sm">
          Powód (opcjonalnie, widoczny tylko dla personelu)
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="np. wizyta u lekarza"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>

        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-medium">Kogo dotyczy</legend>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={appliesToAll} onChange={() => setAppliesToAll(true)} />
            Cały salon
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={!appliesToAll} onChange={() => setAppliesToAll(false)} />
            Wybrani pracownicy
          </label>
          {!appliesToAll && (
            <div className="mt-1 space-y-1 pl-6">
              {employees.map((emp: any) => (
                <label key={emp.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={employeeIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                  {emp.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {collidingCount > 0 && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            W tym czasie {collidingCount === 1 ? 'jest 1 wizyta' : `są ${collidingCount} wizyty`} — pozostaną bez zmian.
            Blokada wstrzymuje tylko nowe zapisy.
          </p>
        )}

        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm" onClick={onClose}>Anuluj</button>
          <button className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isPending} onClick={submit}>
            {isPending ? 'Zapisywanie…' : 'Zablokuj'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Podłącz modal w `CalendarView.tsx`**

Dopisz import:

```ts
import { BlockHoursModal } from './BlockHoursModal';
```

Dopisz stan obok pozostałych (ok. linii 85):

```ts
  const [blockModal, setBlockModal] = useState<{ date: string; time?: string; employeeId?: string } | null>(null);
```

W menu slotu (`CalendarView.tsx:430-473`), po przycisku „Happy Hours”, dopisz czwartą pozycję:

```tsx
            <button
              className="flex items-center gap-2.5 w-full text-sm px-2 py-2 rounded-lg hover:bg-accent text-left"
              onClick={() => {
                setBlockModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
                setSlotMenu(null);
              }}
            >
              <Lock size={15} className="text-gray-600" />
              Zablokuj godziny
            </button>
```

Na końcu komponentu, obok `<HappyHourPanel ... />`, dopisz:

```tsx
      {blockModal && (
        <BlockHoursModal
          open
          onClose={() => setBlockModal(null)}
          prefill={blockModal}
          employees={employees}
          appointments={appointments}
        />
      )}
```

- [ ] **Step 3: Zweryfikuj build**

```bash
cd apps/web && pnpm build
```

Oczekiwane: sukces.

- [ ] **Step 4: Sprawdź w przeglądarce**

W `/admin/wizyty` → kalendarz: kliknij pustą godzinę → „Zablokuj godziny” → zapisz z powodem „Test”.
Oczekiwane: modal ma wstawioną klikniętą datę i godzinę + 60 min; po zapisie blokada pojawia się na kalendarzu bez odświeżania strony. Sprawdź w `/rezerwacja` jako klientka, że zablokowany termin zniknął z listy godzin.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/BlockHoursModal.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(blokady): tworzenie blokady z menu slotu kalendarza"
```

---

### Task 7: Podgląd i usuwanie blokady

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `calendarBlocksApi.remove` z Task 5, eventy blokad z Task 5.
- Produces: stan `blockPopover: { block: CalendarBlock; x: number; y: number } | null`.

- [ ] **Step 1: Dodaj stan i mutację usuwania**

W `CalendarView.tsx` dopisz importy:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
```

Dopisz stan obok pozostałych:

```ts
  const [blockPopover, setBlockPopover] = useState<{ block: CalendarBlock; x: number; y: number } | null>(null);
```

Nad `return (` dopisz:

```ts
  const qc = useQueryClient();
  const { mutate: removeBlock, isPending: isRemovingBlock } = useMutation({
    mutationFn: (id: string) => calendarBlocksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-blocks'] });
      setBlockPopover(null);
    },
  });
```

- [ ] **Step 2: Otwórz popover po kliknięciu w blokadę**

W `eventClick` zamień dodaną w Task 5 linię `if (arg.event.extendedProps.calendarBlockId) return;` na:

```ts
                    if (arg.event.extendedProps.calendarBlockId) {
                      const rect = (arg.el as HTMLElement).getBoundingClientRect();
                      setBlockPopover({
                        block: arg.event.extendedProps.block as CalendarBlock,
                        x: rect.left,
                        y: rect.bottom,
                      });
                      return;
                    }
```

- [ ] **Step 3: Wyrenderuj popover**

Obok bloku „Slot action menu” (`CalendarView.tsx:430`) dopisz:

```tsx
      {blockPopover && (
        <div className="fixed inset-0 z-40" onClick={() => setBlockPopover(null)}>
          <div
            className="absolute w-64 rounded-xl border border-border bg-background p-3 shadow-2xl z-50"
            style={{
              left: Math.min(blockPopover.x, window.innerWidth - 280),
              top: Math.min(blockPopover.y + 6, window.innerHeight - 190),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <Lock size={14} /> Zablokowane
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(blockPopover.block.startsAt).toLocaleString('pl-PL', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
              {' – '}
              {new Date(blockPopover.block.endsAt).toLocaleTimeString('pl-PL', {
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p className="mt-1 text-xs">
              {blockPopover.block.appliesToAll
                ? 'Cały salon'
                : blockPopover.block.employees.map((e) => e.name).join(', ')}
            </p>
            {blockPopover.block.reason && (
              <p className="mt-1 text-xs italic text-muted-foreground">{blockPopover.block.reason}</p>
            )}
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={isRemovingBlock}
              onClick={() => removeBlock(blockPopover.block.id)}
            >
              <Trash2 size={13} />
              {isRemovingBlock ? 'Usuwanie…' : 'Usuń blokadę'}
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Zweryfikuj build**

```bash
cd apps/web && pnpm build
```

Oczekiwane: sukces.

- [ ] **Step 5: Sprawdź w przeglądarce**

Kliknij utworzoną blokadę → popover pokazuje zakres, zasięg i powód → „Usuń blokadę”.
Oczekiwane: blokada znika z kalendarza, a termin wraca na listę wolnych godzin w `/rezerwacja`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(blokady): podgląd i usuwanie blokady z kalendarza"
```

---

### Task 8: Blokady widoczne w terminarzu pracownika

**Files:**
- Modify: `apps/web/src/pages/employee/Schedule.tsx`

**Interfaces:**
- Consumes: `calendarBlocksApi.list` z Task 5 (endpoint dostępny dla roli EMPLOYEE — Task 3).

- [ ] **Step 1: Pobierz blokady dla widocznego tygodnia**

W `apps/web/src/pages/employee/Schedule.tsx` dopisz importy:

```ts
import { useQuery } from '@tanstack/react-query';
import calendarBlocksApi, { type CalendarBlock } from '@/api/calendar-blocks.api';
import { Lock } from 'lucide-react';
```

W komponencie widoku tygodnia, obok istniejących wyliczeń `weekStart` / `weekEnd` (ok. linii 155), dopisz:

```ts
  const { data: weekBlocks = [] } = useQuery({
    queryKey: ['calendar-blocks', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () => calendarBlocksApi.list(weekStart.toISOString(), weekEnd.toISOString()),
    staleTime: 60 * 1000,
  });

  const blocksByDay = useMemo(() => {
    const map = new Map<string, CalendarBlock[]>();
    for (const b of weekBlocks) {
      const key = format(new Date(b.startsAt), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return map;
  }, [weekBlocks]);
```

Jeśli `useMemo` nie jest jeszcze importowane z `react`, dopisz je do istniejącego importu w linii 1.

- [ ] **Step 2: Pokaż plakietkę przy dniu**

W renderze siatki tygodnia, w komórce dnia (pętla po dniach ok. linii 321, gdzie `const key = format(day, 'yyyy-MM-dd')`), pod istniejącą treścią dnia dopisz:

```tsx
                  {(blocksByDay.get(key) ?? []).map((b) => (
                    <div key={b.id} className="mt-1 flex items-center gap-1 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Lock size={9} className="shrink-0" />
                      <span className="truncate">
                        {new Date(b.startsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        –
                        {new Date(b.endsAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
```

Plakietka jest wyłącznie informacyjna — pracownik nie tworzy ani nie usuwa blokad.

- [ ] **Step 3: Zweryfikuj build**

```bash
cd apps/web && pnpm build
```

Oczekiwane: sukces.

- [ ] **Step 4: Sprawdź w przeglądarce**

Zaloguj się kontem pracownika, wejdź w `/employee/terminarz`, przejdź na tydzień z blokadą.
Oczekiwane: przy dniu widoczna ciemna plakietka z kłódką i zakresem godzin.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/employee/Schedule.tsx
git commit -m "feat(blokady): podgląd blokad w terminarzu pracownika"
```

---

### Task 9: Parser plików .ics

**Files:**
- Create: `apps/server/src/modules/external-calendar/external-calendar.parser.ts`
- Test: `apps/server/src/modules/external-calendar/external-calendar.parser.test.ts`
- Modify: `apps/server/package.json`

**Interfaces:**
- Produces:
  - `interface ParsedEvent { uid: string; title: string; startsAt: Date; endsAt: Date; isAllDay: boolean; location: string | null }`
  - `parseIcs(icsText: string, windowStart: Date, windowEnd: Date): ParsedEvent[]`

- [ ] **Step 1: Zainstaluj `node-ical`**

```bash
cd apps/server && pnpm add node-ical
```

- [ ] **Step 2: Napisz test, który nie przechodzi**

Utwórz `apps/server/src/modules/external-calendar/external-calendar.parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseIcs } from './external-calendar.parser';

const WINDOW_START = new Date('2026-09-01T00:00:00Z');
const WINDOW_END = new Date('2026-10-01T00:00:00Z');

const SINGLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:single-1
SUMMARY:Dentysta
LOCATION:Kraków
DTSTART:20260910T090000Z
DTEND:20260910T100000Z
END:VEVENT
END:VCALENDAR`;

const RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:weekly-1
SUMMARY:Joga
DTSTART:20260907T170000Z
DTEND:20260907T180000Z
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
END:VCALENDAR`;

const OUTSIDE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:old-1
SUMMARY:Stare wydarzenie
DTSTART:20250101T090000Z
DTEND:20250101T100000Z
END:VEVENT
END:VCALENDAR`;

describe('parseIcs', () => {
  it('parsuje pojedyncze wydarzenie', () => {
    const events = parseIcs(SINGLE, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe('single-1');
    expect(events[0].title).toBe('Dentysta');
    expect(events[0].location).toBe('Kraków');
    expect(events[0].startsAt.toISOString()).toBe('2026-09-10T09:00:00.000Z');
    expect(events[0].endsAt.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('rozwija wydarzenie cykliczne na osobne wystąpienia', () => {
    const events = parseIcs(RECURRING, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(4);
    expect(new Set(events.map((e) => e.uid))).toEqual(new Set(['weekly-1']));
    const starts = events.map((e) => e.startsAt.toISOString()).sort();
    expect(starts[0]).toBe('2026-09-07T17:00:00.000Z');
    expect(starts[3]).toBe('2026-09-28T17:00:00.000Z');
  });

  it('każde wystąpienie cykliczne zachowuje długość oryginału', () => {
    const events = parseIcs(RECURRING, WINDOW_START, WINDOW_END);
    for (const e of events) {
      expect(e.endsAt.getTime() - e.startsAt.getTime()).toBe(60 * 60 * 1000);
    }
  });

  it('pomija wydarzenia spoza okna', () => {
    expect(parseIcs(OUTSIDE, WINDOW_START, WINDOW_END)).toHaveLength(0);
  });

  it('zwraca pustą listę dla pustego kalendarza', () => {
    const empty = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Test//PL\nEND:VCALENDAR';
    expect(parseIcs(empty, WINDOW_START, WINDOW_END)).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Uruchom test i potwierdź, że nie przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/external-calendar/external-calendar.parser.test.ts
```

Oczekiwane: FAIL — nie da się rozwiązać importu `./external-calendar.parser`.

- [ ] **Step 4: Napisz implementację**

Utwórz `apps/server/src/modules/external-calendar/external-calendar.parser.ts`:

```ts
import ical from 'node-ical';

export interface ParsedEvent {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
  location: string | null;
}

// Czysta funkcja: tekst .ics → lista wystąpień w oknie [windowStart, windowEnd).
// Wydarzenia cykliczne rozwijamy na pojedyncze wystąpienia, z pominięciem EXDATE.
export function parseIcs(icsText: string, windowStart: Date, windowEnd: Date): ParsedEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const out: ParsedEvent[] = [];

  for (const entry of Object.values(parsed) as any[]) {
    if (!entry || entry.type !== 'VEVENT' || !entry.start) continue;

    const uid: string = entry.uid ?? '';
    const title: string = entry.summary ?? '(bez tytułu)';
    const location: string | null = entry.location ?? null;
    const isAllDay = entry.start?.dateOnly === true;
    const durationMs =
      entry.end && entry.start
        ? new Date(entry.end).getTime() - new Date(entry.start).getTime()
        : 60 * 60 * 1000;

    if (entry.rrule) {
      const excluded = new Set<number>(
        Object.values(entry.exdate ?? {}).map((d: any) => new Date(d).getTime()),
      );
      for (const occurrence of entry.rrule.between(windowStart, windowEnd, true)) {
        const startsAt = new Date(occurrence);
        if (excluded.has(startsAt.getTime())) continue;
        out.push({
          uid,
          title,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMs),
          isAllDay,
          location,
        });
      }
      continue;
    }

    const startsAt = new Date(entry.start);
    if (startsAt < windowStart || startsAt >= windowEnd) continue;
    out.push({
      uid,
      title,
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMs),
      isAllDay,
      location,
    });
  }

  return out;
}
```

- [ ] **Step 5: Uruchom test i potwierdź, że przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/external-calendar/external-calendar.parser.test.ts
```

Oczekiwane: PASS, 5 testów. Jeśli test wydarzenia cyklicznego zwróci przesunięte godziny, przyczyną jest strefa czasowa `rrule` — w takim wypadku porównuj `startsAt.getTime()` z jawnie policzoną datą UTC zamiast łańcucha ISO, ale nie zmieniaj implementacji na „naprawianie” offsetu ręcznie.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/external-calendar apps/server/package.json ../../pnpm-lock.yaml
git commit -m "feat(apple): parser plików .ics z obsługą wydarzeń cyklicznych"
```

---

### Task 10: Synchronizacja kalendarza Apple (serwis, scheduler, API)

**Files:**
- Create: `apps/server/src/modules/external-calendar/external-calendar.service.ts`
- Create: `apps/server/src/modules/external-calendar/external-calendar.controller.ts`
- Create: `apps/server/src/modules/external-calendar/external-calendar.router.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/index.ts`

**Interfaces:**
- Consumes: `parseIcs`, `ParsedEvent` z Task 9; modele z Task 1.
- Produces:
  - `getSource()`, `upsertSource({ url, name?, isEnabled? })`, `deleteSource()`
  - `syncNow(): Promise<{ imported: number }>`
  - `listEvents(from: string, to: string)`
  - `initializeExternalCalendarSync(): void`
  - Endpointy: `GET/PUT/DELETE /api/external-calendar/source`, `POST /api/external-calendar/sync`, `GET /api/external-calendar/events`
  - Zdarzenie Socket.IO `external-calendar:updated` do pokoju `admin:global`

- [ ] **Step 1: Napisz serwis**

Utwórz `apps/server/src/modules/external-calendar/external-calendar.service.ts`:

```ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { parseIcs } from './external-calendar.parser';

const WINDOW_DAYS_BACK = 30;
const WINDOW_DAYS_FORWARD = 120;
const FETCH_TIMEOUT_MS = 15_000;

const windowRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - WINDOW_DAYS_BACK);
  const end = new Date(now);
  end.setDate(end.getDate() + WINDOW_DAYS_FORWARD);
  return { start, end };
};

export const getSource = async () => {
  return await prisma.externalCalendarSource.findFirst({ orderBy: { createdAt: 'asc' } });
};

export const upsertSource = async (data: { url: string; name?: string; isEnabled?: boolean }) => {
  const url = data.url?.trim();
  if (!url || !/^(webcal|https?):\/\//i.test(url)) {
    throw new AppError('Podaj poprawny link do kalendarza (webcal:// lub https://)', 400);
  }
  const existing = await getSource();
  if (existing) {
    return await prisma.externalCalendarSource.update({
      where: { id: existing.id },
      data: {
        url,
        name: data.name ?? existing.name,
        isEnabled: data.isEnabled ?? existing.isEnabled,
        lastSyncError: null,
      },
    });
  }
  return await prisma.externalCalendarSource.create({
    data: { url, name: data.name ?? 'Kalendarz Apple', isEnabled: data.isEnabled ?? true },
  });
};

export const deleteSource = async () => {
  const existing = await getSource();
  if (!existing) throw new AppError('Nie skonfigurowano kalendarza', 404);
  await prisma.externalCalendarSource.delete({ where: { id: existing.id } }); // kaskada usuwa wydarzenia
  return { success: true };
};

export const listEvents = async (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new AppError('Nieprawidłowy zakres dat', 400);
  }
  return await prisma.externalCalendarEvent.findMany({
    where: { startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
    orderBy: { startsAt: 'asc' },
  });
};

const fetchIcs = async (url: string): Promise<string> => {
  const httpUrl = url.replace(/^webcal:\/\//i, 'https://');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(httpUrl, { signal: controller.signal });
    if (!res.ok) throw new AppError(`Kalendarz zwrócił status ${res.status}`, 502);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

export const syncNow = async (): Promise<{ imported: number }> => {
  const source = await getSource();
  if (!source) throw new AppError('Nie skonfigurowano kalendarza', 404);
  if (!source.isEnabled) return { imported: 0 };

  const { start, end } = windowRange();

  try {
    const text = await fetchIcs(source.url);
    const events = parseIcs(text, start, end);

    const keptIds: string[] = [];
    for (const ev of events) {
      const saved = await prisma.externalCalendarEvent.upsert({
        where: {
          sourceId_uid_startsAt: { sourceId: source.id, uid: ev.uid, startsAt: ev.startsAt },
        },
        create: {
          sourceId: source.id,
          uid: ev.uid,
          title: ev.title,
          startsAt: ev.startsAt,
          endsAt: ev.endsAt,
          isAllDay: ev.isAllDay,
          location: ev.location,
        },
        update: {
          title: ev.title,
          endsAt: ev.endsAt,
          isAllDay: ev.isAllDay,
          location: ev.location,
        },
      });
      keptIds.push(saved.id);
    }

    // Skasuj z okna wystąpienia, których nie ma już w pliku.
    await prisma.externalCalendarEvent.deleteMany({
      where: {
        sourceId: source.id,
        startsAt: { gte: start, lt: end },
        id: { notIn: keptIds.length > 0 ? keptIds : ['__none__'] },
      },
    });

    await prisma.externalCalendarSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });

    try {
      getIO().to('admin:global').emit('external-calendar:updated');
    } catch {
      // Socket.IO może nie być zainicjalizowany (np. w skryptach) — synchronizacja i tak się powiodła.
    }

    return { imported: events.length };
  } catch (err: any) {
    // Błąd nie kasuje wcześniej pobranych wydarzeń — zostają ostatnie znane dane.
    await prisma.externalCalendarSource.update({
      where: { id: source.id },
      data: { lastSyncError: err?.message ?? 'Nieznany błąd synchronizacji' },
    });
    throw err instanceof AppError ? err : new AppError('Nie udało się pobrać kalendarza', 502);
  }
};

export const initializeExternalCalendarSync = (): void => {
  const tick = async () => {
    try {
      const source = await getSource();
      if (!source || !source.isEnabled) return;
      const { imported } = await syncNow();
      console.log(`[external-calendar] zsynchronizowano ${imported} wydarzeń`);
    } catch (err: any) {
      console.error('[external-calendar] błąd synchronizacji:', err?.message ?? err);
    }
  };

  void tick();
  setInterval(tick, 15 * 60 * 1000);
};
```

- [ ] **Step 2: Napisz kontroler**

Utwórz `apps/server/src/modules/external-calendar/external-calendar.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import {
  getSource,
  upsertSource,
  deleteSource,
  syncNow,
  listEvents,
} from './external-calendar.service';

export const handleGetSource = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getSource());
  } catch (err) {
    next(err);
  }
};

export const handleUpsertSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await upsertSource(req.body));
  } catch (err) {
    next(err);
  }
};

export const handleDeleteSource = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await deleteSource());
  } catch (err) {
    next(err);
  }
};

export const handleSyncNow = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await syncNow());
  } catch (err) {
    next(err);
  }
};

export const handleListEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ message: 'Wymagane parametry from i to' });
      return;
    }
    res.json(await listEvents(from, to));
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 3: Napisz router i zamontuj go**

Utwórz `apps/server/src/modules/external-calendar/external-calendar.router.ts`:

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import {
  handleGetSource,
  handleUpsertSource,
  handleDeleteSource,
  handleSyncNow,
  handleListEvents,
} from './external-calendar.controller';

const router = Router();

router.get('/source', authenticate, requireAdmin, handleGetSource);
router.put('/source', authenticate, requireAdmin, handleUpsertSource);
router.delete('/source', authenticate, requireAdmin, handleDeleteSource);
router.post('/sync', authenticate, requireAdmin, handleSyncNow);
router.get('/events', authenticate, requireAdmin, handleListEvents);

export default router;
```

W `apps/server/src/app.ts` dopisz import obok pozostałych:

```ts
import externalCalendarRouter from './modules/external-calendar/external-calendar.router';
```

i montaż:

```ts
app.use('/api/external-calendar', externalCalendarRouter);
```

- [ ] **Step 4: Wystartuj scheduler w `index.ts`**

W `apps/server/src/index.ts` dopisz import obok pozostałych schedulerów:

```ts
import { initializeExternalCalendarSync } from './modules/external-calendar/external-calendar.service';
```

i wywołanie w `startServer()`, po `initializeSkinScanCleanup();`:

```ts
    initializeExternalCalendarSync();
```

- [ ] **Step 5: Zweryfikuj build i testy**

```bash
cd apps/server && pnpm build && pnpm test
```

Oczekiwane: build OK, wszystkie testy przechodzą.

- [ ] **Step 6: Sprawdź ręcznie**

Uruchom `pnpm dev`, zapisz link do swojego kalendarza i wymuś synchronizację:

```bash
curl -X PUT http://localhost:3001/api/external-calendar/source \
  -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN_ADMINA>" \
  -d '{"url":"webcal://p01.icloud.com/published/..."}'

curl -X POST http://localhost:3001/api/external-calendar/sync \
  -H "Authorization: Bearer <TOKEN_ADMINA>"
```

Oczekiwane: `{"imported": N}` z N > 0, a `GET /api/external-calendar/events?from=...&to=...` zwraca wydarzenia. Wywołaj `POST /sync` drugi raz — liczba wydarzeń w bazie nie może się podwoić.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/external-calendar apps/server/src/app.ts apps/server/src/index.ts
git commit -m "feat(apple): synchronizacja kalendarza iCloud w tle + API"
```

---

### Task 11: Warstwa Apple w kalendarzu admina + ustawienia

**Files:**
- Create: `apps/web/src/api/external-calendar.api.ts`
- Create: `apps/web/src/components/calendar/AppleCalendarOverlay.tsx`
- Create: `apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: endpointy z Task 10.
- Produces: `externalCalendarApi.getSource/saveSource/deleteSource/syncNow/listEvents`, komponent `AppleCalendarOverlay` (render-prop, wzór `HappyHourOverlay.tsx`).

- [ ] **Step 1: Utwórz klienta API**

Utwórz `apps/web/src/api/external-calendar.api.ts`:

```ts
import { api } from '@/lib/axios';

export interface ExternalCalendarSource {
  id: string;
  name: string;
  url: string;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  location: string | null;
}

const externalCalendarApi = {
  getSource: (): Promise<ExternalCalendarSource | null> =>
    api.get('/external-calendar/source').then((r: any) => r.data),
  saveSource: (data: { url: string; name?: string; isEnabled?: boolean }) =>
    api.put('/external-calendar/source', data).then((r: any) => r.data),
  deleteSource: () => api.delete('/external-calendar/source').then((r: any) => r.data),
  syncNow: (): Promise<{ imported: number }> =>
    api.post('/external-calendar/sync').then((r: any) => r.data),
  listEvents: (from: string, to: string): Promise<ExternalCalendarEvent[]> =>
    api.get('/external-calendar/events', { params: { from, to } }).then((r: any) => r.data),
};

export default externalCalendarApi;
```

- [ ] **Step 2: Napisz warstwę tłowych eventów**

Utwórz `apps/web/src/components/calendar/AppleCalendarOverlay.tsx`:

```tsx
import { useEffect } from 'react';
import { EventInput } from '@fullcalendar/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import externalCalendarApi from '@/api/external-calendar.api';
import { useSocket } from '@/hooks/useSocket';

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  employees: any[];
  isResourceView: boolean;
  enabled: boolean;
  children: (events: EventInput[]) => React.ReactNode;
}

export function AppleCalendarOverlay({
  rangeStart, rangeEnd, employees, isResourceView, enabled, children,
}: Props) {
  const qc = useQueryClient();
  const { socket } = useSocket();

  const { data: raw = [] } = useQuery({
    queryKey: ['external-calendar-events', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () => externalCalendarApi.listEvents(rangeStart.toISOString(), rangeEnd.toISOString()),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  // Po zakończonej synchronizacji w tle serwer wysyła sygnał do pokoju admin:global.
  useEffect(() => {
    const onUpdated = () => qc.invalidateQueries({ queryKey: ['external-calendar-events'] });
    socket.on('external-calendar:updated', onUpdated);
    return () => { socket.off('external-calendar:updated', onUpdated); };
  }, [socket, qc]);

  const events: EventInput[] = enabled
    ? raw.flatMap((ev) => {
        const base = {
          start: ev.startsAt,
          end: ev.endsAt,
          display: 'background' as const,
          color: 'rgba(107,114,128,0.20)',
          extendedProps: { appleEventId: ev.id, title: ev.title },
        };
        // W widoku zasobów event bez resourceId nie zostanie wyrysowany —
        // powielamy go na wszystkie kolumny pracowników.
        if (!isResourceView) return [{ ...base, id: `apple-${ev.id}` }];
        return employees.map((emp: any) => ({
          ...base,
          id: `apple-${ev.id}-${emp.id}`,
          resourceId: emp.id,
        }));
      })
    : [];

  return <>{children(events)}</>;
}
```

- [ ] **Step 3: Napisz modal ustawień**

Utwórz `apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import externalCalendarApi from '@/api/external-calendar.api';
import { RefreshCw, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AppleCalendarSettingsModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { data: source } = useQuery({
    queryKey: ['external-calendar-source'],
    queryFn: () => externalCalendarApi.getSource(),
    enabled: open,
  });

  useEffect(() => { setUrl(source?.url ?? ''); }, [source]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['external-calendar-source'] });
    qc.invalidateQueries({ queryKey: ['external-calendar-events'] });
  };

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => externalCalendarApi.saveSource({ url }),
    onSuccess: () => { setMessage('Zapisano link'); invalidate(); },
    onError: (e: any) => setMessage(e?.response?.data?.message ?? 'Nie udało się zapisać'),
  });

  const { mutate: sync, isPending: isSyncing } = useMutation({
    mutationFn: () => externalCalendarApi.syncNow(),
    onSuccess: (r) => { setMessage(`Pobrano ${r.imported} wydarzeń`); invalidate(); },
    onError: (e: any) => setMessage(e?.response?.data?.message ?? 'Synchronizacja nie powiodła się'),
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: () => externalCalendarApi.deleteSource(),
    onSuccess: () => { setUrl(''); setMessage('Odłączono kalendarz'); invalidate(); },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Kalendarz Apple</h2>
          <button className="ml-auto rounded-lg p-1 hover:bg-accent" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-sm">
          Link subskrypcji (webcal:// lub https://)
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="webcal://p01-calendars.icloud.com/published/..."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
        </label>

        <details className="mb-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Skąd wziąć link?</summary>
          <ol className="ml-4 mt-2 list-decimal space-y-1">
            <li>Otwórz aplikację Kalendarz na Macu lub iPhonie.</li>
            <li>Kliknij prawym (lub „Edytuj”) na kalendarzu, który chcesz podpiąć.</li>
            <li>Włącz „Kalendarz publiczny”.</li>
            <li>Skopiuj wyświetlony link i wklej powyżej.</li>
          </ol>
          <p className="mt-2">
            Wydarzenia są tylko wyświetlane — nigdy nie blokują zapisów klientek.
            Żeby zablokować godziny, kliknij godzinę w kalendarzu i wybierz „Zablokuj godziny”.
          </p>
        </details>

        <p className="mb-3 text-xs text-muted-foreground">
          {source?.lastSyncError
            ? <span className="text-red-600">Błąd ostatniej synchronizacji: {source.lastSyncError}</span>
            : source?.lastSyncedAt
              ? `Ostatnia synchronizacja: ${new Date(source.lastSyncedAt).toLocaleString('pl-PL')}`
              : 'Jeszcze nie synchronizowano.'}
        </p>

        {message && <p className="mb-3 text-xs font-medium">{message}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          {source && (
            <button className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
              disabled={isDisconnecting} onClick={() => disconnect()}>
              Odłącz
            </button>
          )}
          <button className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm disabled:opacity-50"
            disabled={isSyncing || !source} onClick={() => sync()}>
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : undefined} />
            Synchronizuj teraz
          </button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isSaving || !url.trim()} onClick={() => save()}>
            {isSaving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Podepnij warstwę i ustawienia w `CalendarView.tsx`**

Dopisz importy:

```ts
import { AppleCalendarOverlay } from './AppleCalendarOverlay';
import { AppleCalendarSettingsModal } from './AppleCalendarSettingsModal';
import { Settings } from 'lucide-react';
```

Dopisz stan:

```ts
  const [showApple, setShowApple] = useState(true);
  const [appleSettingsOpen, setAppleSettingsOpen] = useState(false);
```

W toolbarze, obok przycisku „Ukryj HH” (ok. linii 305), dopisz dwa przyciski:

```tsx
          <button
            onClick={() => setShowApple((v) => !v)}
            className={`px-3 py-1.5 text-sm rounded ${showApple ? 'bg-gray-200 text-gray-800' : 'bg-gray-100'}`}
          >
            {showApple ? 'Ukryj Apple' : 'Pokaż Apple'}
          </button>
          <button
            onClick={() => setAppleSettingsOpen(true)}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
            title="Ustawienia kalendarza Apple"
          >
            <Settings size={15} />
          </button>
```

Owiń istniejący `<HappyHourOverlay>` (linia 315) drugą warstwą tak, żeby oba zestawy eventów trafiły do `allEvents`:

```tsx
          <AppleCalendarOverlay
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            employees={employees}
            isResourceView={isResourceView}
            enabled={showApple}
          >
            {(appleEvents) => (
              <HappyHourOverlay rangeStart={rangeStart} rangeEnd={rangeEnd}>
                {(bgEvents) => {
                  const allEvents: EventInput[] = [
                    ...workingHourEvents,
                    ...appleEvents,
                    ...blockEvents,
                    ...appointmentEvents,
                    ...(showHappyHours ? bgEvents : []),
                  ];
                  // Zwracany <FullCalendar ... /> zostaje dokładnie taki, jaki jest
                  // dziś w CalendarView.tsx:325-388 — nie zmieniamy w nim ani jednej
                  // linii, przenosimy tylko całość o jeden poziom zagnieżdżenia głębiej.
                  return (
                    <FullCalendar ref={calRef} /* ...pozostałe propsy bez zmian... */ />
                  );
                }}
              </HappyHourOverlay>
            )}
          </AppleCalendarOverlay>
```

W `eventContent`, przed obsługą `isWorkingHours`, dopisz etykietę tytułu wydarzenia Apple:

```ts
                    if (arg.event.extendedProps.appleEventId) {
                      return (
                        <div className="px-1 pt-0.5 text-[10px] font-medium text-gray-500 truncate">
                          {arg.event.extendedProps.title}
                        </div>
                      );
                    }
```

W `eventClick`, przed pozostałymi gałęziami, dopisz:

```ts
                    if (arg.event.extendedProps.appleEventId) return;
```

Na końcu komponentu dopisz modal:

```tsx
      <AppleCalendarSettingsModal open={appleSettingsOpen} onClose={() => setAppleSettingsOpen(false)} />
```

- [ ] **Step 5: Zweryfikuj build**

```bash
cd apps/web && pnpm build
```

Oczekiwane: sukces.

- [ ] **Step 6: Sprawdź w przeglądarce**

W `/admin/wizyty` → kalendarz → ikona koła zębatego → wklej swój link iCloud → Zapisz → Synchronizuj teraz.
Oczekiwane: komunikat „Pobrano N wydarzeń”; po zamknięciu modala prywatne wydarzenia widnieją jako blade szare tło z tytułem. Kliknięcie w szare tło nic nie robi. Przycisk „Ukryj Apple” chowa warstwę. Otwórz `/rezerwacja` jako klientka i potwierdź, że w godzinach szarych wydarzeń terminy **nadal są dostępne** — wydarzenia Apple nie blokują zapisów.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/api/external-calendar.api.ts apps/web/src/components/calendar
git commit -m "feat(apple): warstwa wydarzeń Apple w kalendarzu admina + ustawienia linku"
```

---

### Task 12: Aktualizacja spec i deploy

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-kalendarz-apple-i-blokady-design.md`

- [ ] **Step 1: Popraw miejsce konfiguracji w spec**

W sekcji „Frontend” części 1 zamień akapit **Konfiguracja** na:

```markdown
**Konfiguracja** — link wkleja się w modalu `AppleCalendarSettingsModal`, otwieranym
ikoną koła zębatego w toolbarze kalendarza (`/admin/wizyty` → widok kalendarza):
pole na URL, status ostatniej synchronizacji, przycisk „Synchronizuj teraz”,
przycisk „Odłącz”, zwijana instrukcja skąd wziąć link.
```

- [ ] **Step 2: Uruchom pełny zestaw testów i buildów**

```bash
pnpm build
cd apps/server && pnpm test
```

Oczekiwane: build wszystkich paczek OK, wszystkie testy backendu przechodzą.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-27-kalendarz-apple-i-blokady-design.md
git commit -m "docs: konfiguracja kalendarza Apple w modalu kalendarza"
```

- [ ] **Step 4: Deploy**

Backend musi pójść pierwszy — niesie migrację bazy:

```bash
./deploy.sh backend
./deploy.sh frontend
```

- [ ] **Step 5: Weryfikacja na produkcji**

Zaloguj się jako admin na `kosmetologwiktoriacwik.pl`, wejdź w kalendarz wizyt:
1. koło zębate → link do kalendarza jest zapisany, „Synchronizuj teraz” zwraca liczbę wydarzeń,
2. szare wydarzenia widoczne w tle,
3. kliknięcie pustej godziny → „Zablokuj godziny” → blokada pojawia się na kalendarzu,
4. w trybie incognito na `/rezerwacja` zablokowany termin jest niedostępny, a termin pokryty tylko szarym wydarzeniem Apple — dostępny.

---

## Odstępstwa od spec

- **Miejsce konfiguracji linku Apple**: modal w toolbarze kalendarza zamiast `/admin/praca` (uzasadnienie w sekcji „File Structure”; Task 12 aktualizuje spec).
- **Testy synchronizacji**: spec wymieniał cztery testy `external-calendar.sync.test.ts` (brak duplikatów przy ponownym pobraniu, kasowanie wydarzeń usuniętych z pliku, zapis `lastSyncError`). Trzy z nich wymagają bazy, a testy vitest w tym repo są czysto jednostkowe i nie mają fixture'ów Prismy — dokładanie infrastruktury testowej z bazą jest osobnym przedsięwzięciem. Automatyzujemy więc testami tylko parser (Task 9), a pozostałe trzy zachowania weryfikujemy ręcznie w Task 10 krok 6 (dwukrotny `POST /sync` nie może podwoić liczby wydarzeń) i przy okazji błędu sieci. Jeśli chcesz je mieć zautomatyzowane, potrzebna jest osobna decyzja o testach integracyjnych z bazą.

## Notatki dla wykonawcy

- `pnpm dev` z `cosmo-app/` uruchamia backend (3001) i frontend (5173) naraz; Vite proxuje `/api` na backend, więc frontend testujesz na `http://localhost:5173`.
- Token admina do `curl` najprościej zdobyć z DevTools → Application → Session Storage → wpis auth store → `accessToken`.
- Jeśli po migracji TypeScript nie widzi nowych modeli (`prisma.calendarBlock` podkreślone na czerwono), uruchom `cd apps/server && npx prisma generate` i zrestartuj serwer TS w edytorze.
- FullCalendar w widoku zasobów (`resourceTimeGridDay`) pomija eventy bez `resourceId`. Dlatego zarówno blokady „cały salon”, jak i wydarzenia Apple powielamy na kolumny pracowników — to nie jest przeoczenie, tylko wymóg biblioteki.
