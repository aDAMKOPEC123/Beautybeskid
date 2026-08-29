# Czytelność kalendarza admina — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalendarz admina staje się czytelny i spójny z paletą aplikacji: godziny poza pracą są przygaszone zamiast malować pracę na zielono, kafle wizyt pokazują tyle, ile się mieści, siatka dostaje skórkę COSMO, a nad nią staje składana legenda tłumacząca każdy kolor i przełączająca warstwy.

**Architecture:** Cała zmiana jest po stronie frontendu. Logika warstw i gęstości kafli trafia do dwóch nowych modułów z czystymi funkcjami (`calendarLayers.ts`, `cardDensity.ts`), pokrytych testami jednostkowymi. Wygląd trafia do jednego arkusza `calendar.css` scope'owanego klasą `.cosmo-calendar`, z kolorami statusów jako custom properties — jedno źródło dla skórki, kafli i legendy. Legenda to nowy komponent prezentacyjny sterowany stanem trzymanym w `CalendarView`.

**Tech Stack:** React 19, TypeScript, FullCalendar v6 (`@fullcalendar/react`, `resource-timegrid`, `timegrid`, `list`), TanStack Query, date-fns, lucide-react, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-czytelnosc-kalendarza-admina-design.md`

## Global Constraints

- Wszystkie komendy uruchamiane z katalogu `cosmo-app/apps/web`, chyba że napisano inaczej.
- Testy: `pnpm test` lub `pnpm vitest run <ścieżka>` (vitest skonfigurowany, przykład: `src/lib/axios.test.ts`).
- **Nic nie zostaje usunięte.** Każdy istniejący przycisk, widok, modal i ścieżka działania pozostaje i działa tak samo. Zmiany są prezentacyjne plus jeden nowy przełącznik warstwy (`showWorkingHours`).
- Przyciski „Pokaż/Ukryj HH" i „Pokaż/Ukryj Apple" zostają w toolbarze i dzielą stan z legendą — to te same `showHappyHours` / `showApple`.
- Ikony alergii ⚠️ i notatek 📝 są widoczne we **wszystkich** gęstościach kafla — to sygnały bezpieczeństwa klientki.
- Okno doby `07:00`–`21:00` ma jedno źródło: stałe `DAY_WINDOW_START` / `DAY_WINDOW_END`. `slotMinTime` / `slotMaxTime` czytają z nich.
- Warstwy godzin pracy i przygaszenia są `display: 'background'` — nie mogą przechwytywać `dateClick` ani zaznaczania zakresu.
- Kolory pracownic (`EMPLOYEE_COLORS`, `CalendarView.tsx:29`) zostają bez zmian — to kolory tożsamościowe, liczy się ich rozróżnialność, nie zgodność z marką.
- Bez zmian w backendzie, bez migracji Prisma, bez nowych zależności.
- Teksty UI i komentarze po polsku.
- Nie ruszać funkcji badge'a Apple wdrożonej wcześniej tego dnia (`appleCoverage.ts`, gałąź `appleEventId` w `eventContent`) poza tym, co wynika wprost z zadania.

---

### Task 1: Moduł warstw godzin pracy

**Files:**
- Create: `apps/web/src/components/calendar/calendarLayers.ts`
- Test: `apps/web/src/components/calendar/calendarLayers.test.ts`

**Interfaces:**
- Consumes: `WeeklyScheduleEntry`, `WorkDay`, `TimeBlock` z `@/api/employees.api`; `EventInput` z `@fullcalendar/core`.
- Produces:
  - `export const DAY_WINDOW_START = '07:00'` i `export const DAY_WINDOW_END = '21:00'`
  - `export interface TimeRange { start: string; end: string }` (godziny w formacie `"HH:mm"`)
  - `export function mergeRanges(ranges: TimeRange[], windowStart: string, windowEnd: string): TimeRange[]`
  - `export function invertRanges(ranges: TimeRange[], windowStart: string, windowEnd: string): TimeRange[]`
  - `export function buildWorkingHourLayer(employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd, zoomedEmployeeId, isResourceView, colorFor): EventInput[]`

Zdarzenia zwracane przez `buildWorkingHourLayer` niosą w `extendedProps` albo `{ isWorkingHours: true, rangeLabel: string, accentColor: string }`, albo `{ isOffHours: true }`, i mają klasy `cosmo-work-hours` / `cosmo-off-hours`.

- [ ] **Step 1: Write the failing test**

Utwórz `apps/web/src/components/calendar/calendarLayers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  mergeRanges,
  invertRanges,
  buildWorkingHourLayer,
  DAY_WINDOW_START,
  DAY_WINDOW_END,
  type TimeRange,
} from './calendarLayers';

const W = [DAY_WINDOW_START, DAY_WINDOW_END] as const;

describe('mergeRanges', () => {
  it('scala zakresy nachodzące na siebie', () => {
    expect(mergeRanges([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '14:00' }], ...W))
      .toEqual([{ start: '09:00', end: '14:00' }]);
  });

  it('scala zakresy stykające się krawędzią', () => {
    expect(mergeRanges([{ start: '09:00', end: '12:00' }, { start: '12:00', end: '15:00' }], ...W))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('zostawia rozłączne zakresy osobno i sortuje je', () => {
    expect(mergeRanges([{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }], ...W))
      .toEqual([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '16:00' }]);
  });

  it('przycina zakres wystający poza okno', () => {
    expect(mergeRanges([{ start: '05:00', end: '23:00' }], ...W))
      .toEqual([{ start: DAY_WINDOW_START, end: DAY_WINDOW_END }]);
  });

  it('odrzuca zakres całkowicie poza oknem', () => {
    expect(mergeRanges([{ start: '22:00', end: '23:00' }], ...W)).toEqual([]);
  });
});

describe('invertRanges', () => {
  it('pusta lista daje całe okno jako jedną lukę', () => {
    expect(invertRanges([], ...W)).toEqual([{ start: DAY_WINDOW_START, end: DAY_WINDOW_END }]);
  });

  it('jeden blok w środku okna daje dwie luki', () => {
    expect(invertRanges([{ start: '09:00', end: '17:00' }], ...W)).toEqual([
      { start: '07:00', end: '09:00' },
      { start: '17:00', end: '21:00' },
    ]);
  });

  it('blok stykający się z początkiem okna daje jedną lukę po prawej', () => {
    expect(invertRanges([{ start: '07:00', end: '15:00' }], ...W))
      .toEqual([{ start: '15:00', end: '21:00' }]);
  });

  it('bloki podane w odwrotnej kolejności dają ten sam wynik', () => {
    const a = invertRanges([{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }], ...W);
    const b = invertRanges([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '16:00' }], ...W);
    expect(a).toEqual(b);
    expect(a).toEqual([
      { start: '07:00', end: '09:00' },
      { start: '12:00', end: '14:00' },
      { start: '16:00', end: '21:00' },
    ]);
  });

  it('bloki nachodzące nie produkują luki zerowej długości', () => {
    const gaps = invertRanges([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '14:00' }], ...W);
    expect(gaps).toEqual([{ start: '07:00', end: '09:00' }, { start: '14:00', end: '21:00' }]);
    for (const g of gaps) expect(g.start).not.toBe(g.end);
  });

  it('blok pokrywający całe okno daje pustą listę luk', () => {
    expect(invertRanges([{ start: '07:00', end: '21:00' }], ...W)).toEqual([]);
  });

  it('blok wystający poza okno jest przycinany', () => {
    expect(invertRanges([{ start: '05:00', end: '09:00' }], ...W))
      .toEqual([{ start: '09:00', end: '21:00' }]);
  });
});

describe('buildWorkingHourLayer', () => {
  const employees = [{ id: 'e1', name: 'Ala' }, { id: 'e2', name: 'Ola' }];
  const colorFor = (id: string) => (id === 'e1' ? '#111111' : '#222222');
  // 2026-09-03 to czwartek → dayOfWeek 3 w konwencji API (poniedziałek = 0).
  const rangeStart = new Date('2026-09-03T00:00:00');
  const rangeEnd = new Date('2026-09-04T00:00:00');

  const weekly = (isWorking: boolean, blocks: { start: string; end: string }[]) =>
    new Map([
      ['e1', [{ dayOfWeek: 3, isWorking, timeBlocks: blocks }] as any],
      ['e2', [{ dayOfWeek: 3, isWorking, timeBlocks: blocks }] as any],
    ]);

  const noOverrides = new Map<string, any[]>([['e1', []], ['e2', []]]);

  it('w widoku zasobów każdy pracownik dostaje własne pasy pracy i przygaszenia', () => {
    const events = buildWorkingHourLayer(
      employees, weekly(true, [{ start: '09:00', end: '17:00' }]), noOverrides,
      rangeStart, rangeEnd, null, true, colorFor,
    );
    const work = events.filter((e: any) => e.extendedProps.isWorkingHours);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    expect(work).toHaveLength(2);
    expect(off).toHaveLength(4); // 2 luki × 2 pracownice
    expect(work.every((e: any) => e.resourceId)).toBe(true);
    expect(work.every((e: any) => e.display === 'background')).toBe(true);
    expect((work[0] as any).extendedProps.accentColor).toBe('#111111');
    expect((work[0] as any).extendedProps.rangeLabel).toBe('09:00–17:00');
  });

  it('dzień wolny przygasza całe okno doby', () => {
    const events = buildWorkingHourLayer(
      employees, weekly(false, []), noOverrides,
      rangeStart, rangeEnd, null, true, colorFor,
    );
    expect(events.filter((e: any) => e.extendedProps.isWorkingHours)).toHaveLength(0);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    expect(off).toHaveLength(2); // po jednym pełnym pasie na pracownicę
    expect(off[0].start).toBe('2026-09-03T07:00:00');
    expect(off[0].end).toBe('2026-09-03T21:00:00');
  });

  it('poza widokiem zasobów warstwy są wspólne dla salonu i nie mają resourceId', () => {
    const schedules = new Map([
      ['e1', [{ dayOfWeek: 3, isWorking: true, timeBlocks: [{ start: '09:00', end: '13:00' }] }] as any],
      ['e2', [{ dayOfWeek: 3, isWorking: true, timeBlocks: [{ start: '12:00', end: '17:00' }] }] as any],
    ]);
    const events = buildWorkingHourLayer(
      employees, schedules, noOverrides, rangeStart, rangeEnd, null, false, colorFor,
    );
    const work = events.filter((e: any) => e.extendedProps.isWorkingHours);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    // Zakresy obu pracownic scalają się w jeden pas 09:00–17:00.
    expect(work).toHaveLength(1);
    expect(work[0].start).toBe('2026-09-03T09:00:00');
    expect(work[0].end).toBe('2026-09-03T17:00:00');
    expect(off).toHaveLength(2);
    expect(events.every((e: any) => e.resourceId === undefined)).toBe(true);
  });

  it('override dnia ma pierwszeństwo nad grafikiem tygodniowym', () => {
    const overrides = new Map([
      ['e1', [{ date: '2026-09-03', isWorking: false, timeBlocks: [] }] as any],
      ['e2', [] as any],
    ]);
    const events = buildWorkingHourLayer(
      employees, weekly(true, [{ start: '09:00', end: '17:00' }]), overrides,
      rangeStart, rangeEnd, 'e1', true, colorFor,
    );
    expect(events.filter((e: any) => e.extendedProps.isWorkingHours)).toHaveLength(0);
    expect(events.filter((e: any) => e.extendedProps.isOffHours)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/calendar/calendarLayers.test.ts`
Expected: FAIL — `Failed to resolve import "./calendarLayers"`.

- [ ] **Step 3: Write the implementation**

Utwórz `apps/web/src/components/calendar/calendarLayers.ts`:

```ts
import { format, addDays } from 'date-fns';
import { EventInput } from '@fullcalendar/core';
import type { WeeklyScheduleEntry, WorkDay } from '@/api/employees.api';

// Okno doby widoczne w siatce. Jedno źródło prawdy: FullCalendar dostaje
// slotMinTime/slotMaxTime z tych samych stałych, więc przygaszenie nigdy nie
// rozjedzie się z zakresem godzin rysowanym przez kalendarz.
export const DAY_WINDOW_START = '07:00';
export const DAY_WINDOW_END = '21:00';

export interface TimeRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHmm = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/**
 * Przycina zakresy do okna, odrzuca puste, sortuje i scala nachodzące
 * oraz stykające się krawędziami. Wynik jest rozłączny i rosnący.
 */
export function mergeRanges(
  ranges: TimeRange[],
  windowStart: string,
  windowEnd: string,
): TimeRange[] {
  const ws = toMinutes(windowStart);
  const we = toMinutes(windowEnd);
  if (we <= ws) return [];

  const clipped = ranges
    .map((r) => ({ start: Math.max(ws, toMinutes(r.start)), end: Math.min(we, toMinutes(r.end)) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const r of clipped) {
    const last = merged[merged.length - 1];
    // `<=` scala też zakresy stykające się krawędzią — inaczej powstałaby
    // między nimi luka zerowej długości.
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  return merged.map((r) => ({ start: toHHmm(r.start), end: toHHmm(r.end) }));
}

/** Dopełnienie zakresów w oknie doby — czyli czas poza pracą. */
export function invertRanges(
  ranges: TimeRange[],
  windowStart: string,
  windowEnd: string,
): TimeRange[] {
  const ws = toMinutes(windowStart);
  const we = toMinutes(windowEnd);
  if (we <= ws) return [];

  const merged = mergeRanges(ranges, windowStart, windowEnd);
  const gaps: TimeRange[] = [];
  let cursor = ws;
  for (const r of merged) {
    const rs = toMinutes(r.start);
    if (rs > cursor) gaps.push({ start: toHHmm(cursor), end: toHHmm(rs) });
    cursor = toMinutes(r.end);
  }
  if (cursor < we) gaps.push({ start: toHHmm(cursor), end: toHHmm(we) });
  return gaps;
}

/** Zakresy pracy jednej osoby w danym dniu, z uwzględnieniem override'u dnia. */
function workRangesFor(
  employeeId: string,
  dateStr: string,
  apiDow: number,
  weeklySchedules: Map<string, WeeklyScheduleEntry[]>,
  workDayOverrides: Map<string, WorkDay[]>,
): TimeRange[] {
  const override = (workDayOverrides.get(employeeId) ?? []).find((w) => w.date.startsWith(dateStr));
  if (override !== undefined) {
    if (!override.isWorking) return [];
    return (override.timeBlocks ?? []).map((b) => ({ start: b.start, end: b.end }));
  }
  const weekly = (weeklySchedules.get(employeeId) ?? []).find((e) => e.dayOfWeek === apiDow);
  if (!weekly?.isWorking) return [];
  return (weekly.timeBlocks ?? []).map((b) => ({ start: b.start, end: b.end }));
}

/**
 * Dwie warstwy tła: godziny pracy (bez wypełnienia, z akcentem w kolorze
 * pracownicy) oraz czas poza pracą (przygaszenie).
 *
 * Poza widokiem zasobów kolumna reprezentuje cały salon, nie pojedynczą osobę —
 * warstwy są wtedy liczone ze scalonych zakresów wszystkich widocznych
 * pracownic i emitowane raz, bez resourceId. Bez tego przygaszenia nakładałyby
 * się na siebie po jednym na osobę i kolumna zrobiłaby się czarna.
 */
export function buildWorkingHourLayer(
  employees: any[],
  weeklySchedules: Map<string, WeeklyScheduleEntry[]>,
  workDayOverrides: Map<string, WorkDay[]>,
  rangeStart: Date,
  rangeEnd: Date,
  zoomedEmployeeId: string | null,
  isResourceView: boolean,
  colorFor: (employeeId: string) => string,
): EventInput[] {
  const events: EventInput[] = [];
  const visible = zoomedEmployeeId
    ? employees.filter((e: any) => e.id === zoomedEmployeeId)
    : employees;

  let d = new Date(rangeStart);
  while (d < rangeEnd) {
    const dateStr = format(d, 'yyyy-MM-dd');
    const apiDow = (d.getDay() + 6) % 7; // JS Sun=0 → Mon=0

    const pushWork = (r: TimeRange, key: string, resourceId?: string, accentColor?: string) => {
      events.push({
        id: `work-${key}-${dateStr}-${r.start}`,
        ...(resourceId ? { resourceId } : {}),
        start: `${dateStr}T${r.start}:00`,
        end: `${dateStr}T${r.end}:00`,
        display: 'background',
        classNames: ['cosmo-work-hours'],
        // FullCalendar przekłada borderColor eventu na border-color elementu tła,
        // więc kolor pracownicy trafia na lewą krawędź pasa bez custom property.
        borderColor: accentColor ?? 'transparent',
        extendedProps: {
          isWorkingHours: true,
          rangeLabel: `${r.start}–${r.end}`,
          accentColor: accentColor ?? 'transparent',
        },
      });
    };

    const pushOff = (r: TimeRange, key: string, resourceId?: string) => {
      events.push({
        id: `off-${key}-${dateStr}-${r.start}`,
        ...(resourceId ? { resourceId } : {}),
        start: `${dateStr}T${r.start}:00`,
        end: `${dateStr}T${r.end}:00`,
        display: 'background',
        classNames: ['cosmo-off-hours'],
        extendedProps: { isOffHours: true },
      });
    };

    if (isResourceView) {
      for (const emp of visible) {
        const ranges = workRangesFor(emp.id, dateStr, apiDow, weeklySchedules, workDayOverrides);
        for (const r of mergeRanges(ranges, DAY_WINDOW_START, DAY_WINDOW_END)) {
          pushWork(r, emp.id, emp.id, colorFor(emp.id));
        }
        for (const gap of invertRanges(ranges, DAY_WINDOW_START, DAY_WINDOW_END)) {
          pushOff(gap, emp.id, emp.id);
        }
      }
    } else {
      const all = visible.flatMap((emp: any) =>
        workRangesFor(emp.id, dateStr, apiDow, weeklySchedules, workDayOverrides),
      );
      const accent = visible.length === 1 ? colorFor(visible[0].id) : undefined;
      for (const r of mergeRanges(all, DAY_WINDOW_START, DAY_WINDOW_END)) {
        pushWork(r, 'salon', undefined, accent);
      }
      for (const gap of invertRanges(all, DAY_WINDOW_START, DAY_WINDOW_END)) {
        pushOff(gap, 'salon');
      }
    }

    d = addDays(d, 1);
  }

  return events;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/calendar/calendarLayers.test.ts`
Expected: PASS — 18 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/calendarLayers.ts apps/web/src/components/calendar/calendarLayers.test.ts
git commit -m "feat(kalendarz): warstwy godzin pracy i przygaszenia czasu poza pracą"
```

---

### Task 2: Gęstość kafla wizyty

**Files:**
- Create: `apps/web/src/components/calendar/cardDensity.ts`
- Test: `apps/web/src/components/calendar/cardDensity.test.ts`

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces:
  - `export type CardDensity = 'compact' | 'medium' | 'full'`
  - `export function cardDensity(durationMinutes: number): CardDensity`

- [ ] **Step 1: Write the failing test**

Utwórz `apps/web/src/components/calendar/cardDensity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cardDensity } from './cardDensity';

describe('cardDensity', () => {
  it('krótka wizyta daje compact', () => {
    expect(cardDensity(15)).toBe('compact');
    expect(cardDensity(30)).toBe('compact');
  });

  it('próg 45 minut oddziela compact od medium', () => {
    expect(cardDensity(44)).toBe('compact');
    expect(cardDensity(45)).toBe('medium');
  });

  it('próg 90 minut oddziela medium od full', () => {
    expect(cardDensity(89)).toBe('medium');
    expect(cardDensity(90)).toBe('full');
  });

  it('długa wizyta daje full', () => {
    expect(cardDensity(180)).toBe('full');
  });

  it('wartości bezsensowne dają compact', () => {
    expect(cardDensity(0)).toBe('compact');
    expect(cardDensity(-30)).toBe('compact');
    expect(cardDensity(NaN)).toBe('compact');
    expect(cardDensity(Infinity)).toBe('full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/calendar/cardDensity.test.ts`
Expected: FAIL — `Failed to resolve import "./cardDensity"`.

- [ ] **Step 3: Write the implementation**

Utwórz `apps/web/src/components/calendar/cardDensity.ts`:

```ts
export type CardDensity = 'compact' | 'medium' | 'full';

const MEDIUM_FROM_MINUTES = 45;
const FULL_FROM_MINUTES = 90;

/**
 * Ile treści zmieści się w kaflu wizyty.
 *
 * Liczone z długości wizyty, nie z pikseli: FullCalendar v6 nie podaje
 * wiarygodnej wysokości elementu w eventContent podczas pierwszego renderu
 * (patrz komentarz w AppointmentCard.tsx). Długość jest stabilnym
 * przybliżeniem i daje się przetestować bez renderowania.
 *
 * Wartość bezsensowna (NaN, zero, ujemna) daje compact — najmniej treści,
 * czyli wybór, który nigdy nie przepełni kafla.
 */
export function cardDensity(durationMinutes: number): CardDensity {
  if (Number.isNaN(durationMinutes)) return 'compact';
  if (durationMinutes >= FULL_FROM_MINUTES) return 'full';
  if (durationMinutes >= MEDIUM_FROM_MINUTES) return 'medium';
  return 'compact';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/calendar/cardDensity.test.ts`
Expected: PASS — 5 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/cardDensity.ts apps/web/src/components/calendar/cardDensity.test.ts
git commit -m "feat(kalendarz): funkcja gęstości kafla wizyty"
```

---

### Task 3: Arkusz skórki kalendarza

**Files:**
- Create: `apps/web/src/components/calendar/calendar.css`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (import CSS, klasa `.cosmo-calendar` na kontenerze, `slotMinTime`/`slotMaxTime` ze stałych)

**Interfaces:**
- Consumes: `DAY_WINDOW_START`, `DAY_WINDOW_END` z Taska 1.
- Produces: custom properties dostępne dla `AppointmentCard` i legendy:
  `--cal-status-pending`, `--cal-status-confirmed`, `--cal-status-completed`,
  `--cal-status-cancelled-bg`, `--cal-status-cancelled-text`, `--cal-offhours`.
  Klasy `.cosmo-work-hours` i `.cosmo-off-hours` stylują warstwy z Taska 1.

- [ ] **Step 1: Utwórz arkusz**

Utwórz `apps/web/src/components/calendar/calendar.css`:

```css
/* Skórka kalendarza admina. Wszystko pod .cosmo-calendar, żeby nadpisania
   FullCalendara nie wyciekły na inne instancje w aplikacji. Kolory statusów
   są custom properties — czerpią z nich AppointmentCard i legenda, więc
   zmiana odcienia w jednym miejscu przechodzi przez cały kalendarz. */
.cosmo-calendar {
  --cal-status-pending: hsl(35 70% 38%);
  --cal-status-confirmed: hsl(142 33% 36%);
  --cal-status-completed: hsl(135 15% 42%);
  --cal-status-cancelled-bg: hsl(0 25% 93%);
  --cal-status-cancelled-text: hsl(0 30% 38%);
  --cal-offhours: hsl(150 37% 16% / 0.07);
}

/* --- Siatka --- */

.cosmo-calendar .fc {
  --fc-border-color: hsl(var(--border));
  --fc-page-bg-color: transparent;
  --fc-now-indicator-color: hsl(var(--primary));
}

.cosmo-calendar .fc-theme-standard td,
.cosmo-calendar .fc-theme-standard th {
  border-color: hsl(var(--border));
}

.cosmo-calendar .fc-scrollgrid {
  border-radius: var(--radius);
  overflow: hidden;
}

/* Pełna godzina musi być wyraźniejsza niż półgodzina — inaczej nie da się
   policzyć godzin wzrokiem, bo obie linie wyglądają identycznie. */
.cosmo-calendar .fc-timegrid-slot-minor {
  border-top-style: dotted;
  border-top-color: hsl(var(--border));
}

.cosmo-calendar .fc-timegrid-slot-label {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.cosmo-calendar .fc-col-header-cell {
  background: hsl(var(--secondary));
  font-weight: 600;
  color: hsl(var(--foreground));
  padding: 2px 0;
}

.cosmo-calendar .fc-day-today {
  background: hsl(var(--secondary) / 0.55) !important;
}

/* --- Warstwa godzin pracy --- */

/* Bez wypełnienia: kolory wizyt i Happy Hours nie mają z czym konkurować.
   Widoczność daje wyłącznie akcent przy lewej krawędzi. */
/* Kolor krawędzi przychodzi z borderColor eventu (kolor pracownicy), więc tutaj
   ustawiamy wyłącznie grubość i styl — inaczej nadpisalibyśmy kolor. */
.cosmo-calendar .fc-bg-event.cosmo-work-hours {
  background: transparent;
  opacity: 1;
  border-left-width: 3px;
  border-left-style: solid;
}

.cosmo-calendar .fc-bg-event.cosmo-off-hours {
  background: var(--cal-offhours);
  opacity: 1;
}

.cosmo-calendar .cosmo-work-hours-label {
  font-size: 10px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  padding: 2px 4px;
}

/* --- Kafle wizyt --- */

.cosmo-calendar .fc-timegrid-event {
  border: none;
  box-shadow: none;
  background: transparent;
}

.cosmo-calendar .fc-timegrid-event .fc-event-main {
  padding: 0;
}

/* --- Blokady --- */

.cosmo-calendar .cosmo-calendar-block {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgb(255 255 255 / 0.12) 4px,
    rgb(255 255 255 / 0.12) 8px
  );
}
```

- [ ] **Step 2: Wepnij arkusz i klasę w CalendarView**

W `CalendarView.tsx` dopisz import obok pozostałych importów lokalnych:

```ts
import { DAY_WINDOW_START, DAY_WINDOW_END } from './calendarLayers';
import './calendar.css';
```

Znajdź kontener siatki (dziś: `<div className="flex-1 overflow-auto p-2" style={hhPanelOpen ? { cursor: 'crosshair' } : undefined}>`) i dopisz do niego klasę `cosmo-calendar`:

```tsx
        <div
          className="cosmo-calendar flex-1 overflow-auto p-2"
          style={hhPanelOpen ? { cursor: 'crosshair' } : undefined}
        >
```

Zamień zahardkodowane granice doby w propsach FullCalendara:

```tsx
                  slotMinTime={`${DAY_WINDOW_START}:00`}
                  slotMaxTime={`${DAY_WINDOW_END}:00`}
```

- [ ] **Step 3: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS — testy z Tasków 1 i 2 nadal przechodzą.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/calendar.css apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): skórka siatki w palecie aplikacji"
```

---

### Task 4: Kafel wizyty zależny od gęstości

**Files:**
- Modify: `apps/web/src/components/calendar/AppointmentCard.tsx` (cały plik)

**Interfaces:**
- Consumes: `cardDensity`, `CardDensity` z Taska 2; custom properties `--cal-status-*` z Taska 3.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Przepisz komponent**

Zamień całą zawartość `apps/web/src/components/calendar/AppointmentCard.tsx` na:

```tsx
import { EventContentArg } from '@fullcalendar/core';
import { cn } from '@/lib/utils';
import { cardDensity } from './cardDensity';

// Kolory statusów pochodzą z custom properties zdefiniowanych w calendar.css —
// jedno źródło wspólne z legendą, więc próbka w legendzie nigdy nie rozjedzie
// się z kaflem na siatce.
const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  PENDING: { background: 'var(--cal-status-pending)', color: '#fff' },
  CONFIRMED: { background: 'var(--cal-status-confirmed)', color: '#fff' },
  COMPLETED: { background: 'var(--cal-status-completed)', color: '#fff' },
  CANCELLED: { background: 'var(--cal-status-cancelled-bg)', color: 'var(--cal-status-cancelled-text)' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface AppointmentEventProps {
  clientName: string;
  serviceName: string;
  price: number;
  discountPercent?: number;
  status: string;
  employeeInitials?: string;
  employeeColor?: string;
  hasAllergies: boolean;
  hasNotes: boolean;
  phone?: string;
}

export function AppointmentCard({ event }: EventContentArg) {
  const props = event.extendedProps as AppointmentEventProps;

  const priceLabel = props.discountPercent
    ? `${props.price} zł (–${props.discountPercent}%)`
    : `${props.price} zł`;

  const fmt = (d: Date) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const startLabel = event.start ? fmt(event.start) : '';
  const timeRange = event.start && event.end
    ? `${fmt(event.start)} – ${fmt(event.end)}`
    : startLabel;

  const durationMinutes = event.start && event.end
    ? (event.end.getTime() - event.start.getTime()) / 60_000
    : 0;
  const density = cardDensity(durationMinutes);

  const style = STATUS_STYLE[props.status] ?? { background: 'var(--cal-status-completed)', color: '#fff' };
  const isUpcoming = props.status === 'CONFIRMED' || props.status === 'PENDING';
  const isCancelled = props.status === 'CANCELLED';

  // Ikony ostrzegawcze towarzyszą wizycie w każdej gęstości — to sygnały
  // bezpieczeństwa klientki, nie ozdoba, więc nigdy nie wypadają przez brak miejsca.
  const warnings = (
    <>
      {props.hasAllergies && <span title="Alergie">⚠️</span>}
      {props.hasNotes && <span title="Notatki">📝</span>}
    </>
  );

  return (
    <div
      className={cn(
        'h-full overflow-hidden rounded px-1.5 py-1 text-[11px] leading-snug',
        isUpcoming && 'border-l-[3px] border-l-caramel',
        isCancelled && 'line-through opacity-75',
      )}
      style={style}
    >
      {density === 'full' ? (
        <>
          <div className="opacity-80">{timeRange}</div>
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold">{props.clientName}</span>
            {warnings}
          </div>
          <div className="truncate opacity-90">{props.serviceName}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="opacity-80">{priceLabel}</span>
            <span className="rounded bg-white/20 px-1 text-[9px]">
              {STATUS_LABELS[props.status] ?? props.status}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            {props.employeeInitials && (
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ background: props.employeeColor ?? '#6366f1' }}
              >
                {props.employeeInitials}
              </span>
            )}
            {props.phone && <span className="truncate opacity-70">{props.phone}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <span className="shrink-0 font-semibold">{startLabel}</span>
            <span className="truncate">{props.clientName}</span>
            <span className="ml-auto flex shrink-0 items-center gap-0.5">{warnings}</span>
          </div>
          {density === 'medium' && (
            <div className="truncate opacity-90">{props.serviceName}</div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/AppointmentCard.tsx
git commit -m "feat(kalendarz): kafel wizyty pokazuje tyle treści, ile się mieści"
```

---

### Task 5: Legenda i wpięcie warstw

**Files:**
- Create: `apps/web/src/components/calendar/CalendarLegend.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (stan `showWorkingHours`, zamiana `buildWorkingHourEvents` na `buildWorkingHourLayer`, render legendy, `eventContent` dla warstw)

**Interfaces:**
- Consumes: `buildWorkingHourLayer` z Taska 1; custom properties z Taska 3.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Utwórz komponent legendy**

Utwórz `apps/web/src/components/calendar/CalendarLegend.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

const STORAGE_KEY = 'cosmo-calendar-legend-open';

interface Props {
  showWorkingHours: boolean;
  onToggleWorkingHours: () => void;
  showApple: boolean;
  onToggleApple: () => void;
  showHappyHours: boolean;
  onToggleHappyHours: () => void;
}

function Swatch({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-3.5 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border">
      {children}
    </span>
  );
}

/** Pozycja informacyjna — nie jest przyciskiem, żeby nie sugerować interakcji, której nie ma. */
function Item({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Swatch>{swatch}</Swatch>
      {label}
    </span>
  );
}

function ToggleItem({
  swatch, label, active, onClick, hint,
}: {
  swatch: React.ReactNode; label: string; active: boolean; onClick: () => void; hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] transition-opacity hover:bg-accent ${
        active ? 'text-foreground' : 'text-muted-foreground opacity-50'
      }`}
    >
      <Swatch>{swatch}</Swatch>
      {label}
    </button>
  );
}

export function CalendarLegend({
  showWorkingHours, onToggleWorkingHours,
  showApple, onToggleApple,
  showHappyHours, onToggleHappyHours,
}: Props) {
  const isMobile = useIsMobile();
  // Na telefonie domyślnie zwinięta — tam każdy piksel wysokości siatki jest cenny.
  const [open, setOpen] = useState(!isMobile);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setOpen(saved === '1');
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  return (
    <div className="border-b bg-white px-3 py-1.5">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
      >
        Legenda
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ToggleItem
            label="Godziny pracy"
            active={showWorkingHours}
            onClick={onToggleWorkingHours}
            hint="Pokaż lub ukryj przygaszenie czasu poza godzinami pracy"
            swatch={<span className="h-full w-full border-l-[3px] border-l-primary bg-white" />}
          />
          <Item label="Oczekująca" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-pending)' }} />} />
          <Item label="Potwierdzona" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-confirmed)' }} />} />
          <Item label="Zrealizowana" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-completed)' }} />} />
          <Item label="Anulowana" swatch={<span className="h-full w-full" style={{ background: 'var(--cal-status-cancelled-bg)' }} />} />
          <Item
            label="Blokada — zapisy wstrzymane"
            swatch={<span className="flex h-full w-full items-center justify-center bg-gray-700 text-white"><Lock size={8} /></span>}
          />
          <ToggleItem
            label="Kalendarz Apple (❗ blokuje godziny)"
            active={showApple}
            onClick={onToggleApple}
            hint="Pokaż lub ukryj wydarzenia z kalendarza Apple"
            swatch={<span className="h-full w-full" style={{ background: 'rgba(107,114,128,0.35)' }} />}
          />
          <ToggleItem
            label="Happy Hour"
            active={showHappyHours}
            onClick={onToggleHappyHours}
            hint="Pokaż lub ukryj promocje Happy Hours"
            swatch={<span className="h-full w-full border-t-[3px] border-t-amber-500 bg-amber-50" />}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wepnij stan i warstwę w CalendarView**

Dopisz importy:

```ts
import { CalendarLegend } from './CalendarLegend';
import { buildWorkingHourLayer } from './calendarLayers';
```

Dodaj stan obok `showApple` (linia ~181):

```ts
  const [showWorkingHours, setShowWorkingHours] = useState(true);
```

Zamień memo budujące warstwę godzin pracy (dziś `buildWorkingHourEvents`, linia ~265). Uwaga: `isResourceView` jest definiowane **poniżej** tego memo (linia ~270) — przenieś deklarację `isResourceView` przed to memo, inaczej dostaniesz błąd „used before declaration":

```ts
  const isResourceView = view === 'resourceTimeGridDay' && !zoomedEmployeeId;

  const workingHourEvents = useMemo(
    () => (showWorkingHours
      ? buildWorkingHourLayer(
          employees, weeklySchedules, workDayOverrides,
          rangeStart, rangeEnd, zoomedEmployeeId, isResourceView,
          (empId) => employeeColor(employees.findIndex((e: any) => e.id === empId)),
        )
      : []),
    [employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd, zoomedEmployeeId, isResourceView, showWorkingHours],
  );
```

Usuń starą funkcję `buildWorkingHourEvents` (linie ~33–76) — jej zadanie przejmuje `buildWorkingHourLayer`. To jedyne jej wywołanie w repozytorium.

- [ ] **Step 3: Wyrenderuj legendę**

Wstaw `<CalendarLegend>` bezpośrednio **przed** kontenerem siatki (`<div className="cosmo-calendar flex-1 …">`), poniżej toolbara i paska pracownic mobilnych:

```tsx
        <CalendarLegend
          showWorkingHours={showWorkingHours}
          onToggleWorkingHours={() => setShowWorkingHours((v) => !v)}
          showApple={showApple}
          onToggleApple={() => setShowApple((v) => !v)}
          showHappyHours={showHappyHours}
          onToggleHappyHours={() => setShowHappyHours((v) => !v)}
        />
```

- [ ] **Step 4: Zaktualizuj eventContent dla warstw**

Znajdź gałąź `isWorkingHours` w `eventContent` (dziś linie ~684–690) i zamień ją na wersję obsługującą obie nowe warstwy:

```tsx
                        if (arg.event.extendedProps.isOffHours) {
                          return <div />;
                        }
                        if (arg.event.extendedProps.isWorkingHours) {
                          return (
                            <div className="cosmo-work-hours-label">
                              Godziny pracy {arg.event.extendedProps.rangeLabel}
                            </div>
                          );
                        }
```

Warstwa przygaszenia zwraca pusty `<div />`, bo nie ma nic do powiedzenia — całą jej treścią jest kolor tła. Akcent w kolorze pracownicy nie wymaga tu niczego: `borderColor` ustawiony na evencie w Tasku 1 trafia prosto na `border-color` elementu tła, a `calendar.css` z Taska 3 nadaje mu wyłącznie grubość i styl.

- [ ] **Step 5: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS — testy z Tasków 1 i 2 nadal przechodzą bez żadnej zmiany w asercjach.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/calendar/CalendarLegend.tsx apps/web/src/components/calendar/CalendarView.tsx apps/web/src/components/calendar/calendarLayers.ts apps/web/src/components/calendar/calendarLayers.test.ts apps/web/src/components/calendar/calendar.css
git commit -m "feat(kalendarz): składana legenda i odwrócona warstwa godzin pracy"
```

---

### Task 6: Grupowanie i kolory toolbara

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (toolbar desktopowy, dziś linie ~559–633; toolbar mobilny ~505–556; arkusz akcji mobilnych ~920–945)

**Interfaces:**
- Consumes: nic nowego.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Przepisz toolbar desktopowy**

Zamień zawartość `<div className="hidden md:flex items-center gap-2 p-3 border-b bg-white flex-wrap">` na wersję pogrupowaną. **Każdy przycisk zostaje, każdy `onClick` zostaje bez zmian** — zmienia się wyłącznie kolejność wizualna, separatory i klasy kolorów:

```tsx
        {/* Toolbar */}
        <div className="hidden md:flex items-center gap-2 p-3 border-b bg-white flex-wrap">
          {/* Nawigacja */}
          <div className="flex items-center gap-1">
            <button onClick={() => calRef.current?.getApi().prev()} className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent">←</button>
            <button onClick={() => calRef.current?.getApi().today()} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Dziś</button>
            <button onClick={() => calRef.current?.getApi().next()} className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent">→</button>
          </div>

          <span className="h-6 w-px bg-border" aria-hidden />

          {/* Widoki */}
          <div className="flex items-center gap-1">
            {zoomedEmployeeId && (
              <button
                onClick={() => { setZoomedEmployeeId(null); switchView('resourceTimeGridDay'); }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent"
              >
                ← Wszyscy
              </button>
            )}
            <button
              onClick={() => switchView('resourceTimeGridDay')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'resourceTimeGridDay' && !zoomedEmployeeId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Dzień
            </button>
            <button
              onClick={() => switchView('timeGridWeek')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'timeGridWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Tydzień
            </button>
            <button
              onClick={() => switchView('listWeek')}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'listWeek' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
            >
              Lista
            </button>
          </div>

          <span className="h-6 w-px bg-border" aria-hidden />

          {/* Akcje */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setAddModal({})}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              + Wizyta
            </button>
            <button
              onClick={() => setExternalModal({})}
              className="rounded-lg border border-primary/40 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-secondary"
            >
              + Klientka z zewnątrz
            </button>
            <button
              onClick={() => {
                setHhPanelOpen((v) => !v);
                if (hhPanelOpen) setHhPrefill(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${hhPanelOpen ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
            >
              ⭐ Happy Hour
            </button>
            <button
              onClick={() => setShowHappyHours(v => !v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${showHappyHours ? 'bg-secondary text-secondary-foreground' : 'bg-white text-muted-foreground opacity-60'} hover:bg-accent`}
            >
              {showHappyHours ? 'Ukryj HH' : 'Pokaż HH'}
            </button>
            <button
              onClick={() => setShowApple((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-sm ${showApple ? 'bg-secondary text-secondary-foreground' : 'bg-white text-muted-foreground opacity-60'} hover:bg-accent`}
            >
              {showApple ? 'Ukryj Apple' : 'Pokaż Apple'}
            </button>
            <button
              onClick={() => setAppleSettingsOpen(true)}
              className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent"
              title="Ustawienia kalendarza Apple"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
```

- [ ] **Step 2: Ujednolić kolory toolbara mobilnego**

W toolbarze mobilnym zamień `bg-indigo-600 text-white` na `bg-primary text-primary-foreground`, a `bg-gray-100` na `bg-secondary text-secondary-foreground`. Dotyczy to przycisków `Dziś`, `Lista`, `Siatka`, strzałek i przycisku „Więcej akcji", oraz paska wyboru pracownic (`bg-indigo-600` → `bg-primary`). **Nie zmieniaj żadnego `onClick`, `aria-label` ani `min-h-11`** — wysokości dotykowe muszą zostać.

- [ ] **Step 3: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm build`
Expected: build przechodzi, audyt SEO zdany.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): pogrupowany toolbar w palecie aplikacji"
```

---

### Task 7: Weryfikacja w przeglądarce i deploy

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże problem.

**Interfaces:**
- Consumes: wszystko z Tasków 1–6.
- Produces: działająca funkcja na produkcji.

- [ ] **Step 1: Uruchom aplikację**

Z katalogu `cosmo-app`: `pnpm dev`, otwórz `http://localhost:5173/admin/wizyty`, zaloguj się jako admin.

- [ ] **Step 2: Widok dnia z kolumnami pracownic**

Oczekiwane: czas poza godzinami pracy przygaszony, pas godzin pracy bez wypełnienia z kolorową linią przy lewej krawędzi, kolumna pracownicy nieobecnej tego dnia przygaszona w całości od 07:00 do 21:00.

- [ ] **Step 3: Widok tygodnia i listy**

Tydzień: przygaszenie liczone dla całego salonu — slot jest przygaszony tylko wtedy, gdy **żadna** pracownica wtedy nie pracuje. Kolumna nie robi się czarna od nakładających się warstw.
Lista: widok listy nie ma siatki — potwierdź, że skórka go nie zepsuła.

- [ ] **Step 4: Widok pojedynczej pracownicy**

Kliknij nagłówek kolumny, żeby zoomować. Oczekiwane: warstwy tylko dla niej, akcent w jej kolorze, przycisk „← Wszyscy" wraca.

- [ ] **Step 5: Legenda**

Zwiń i rozwiń. Odśwież stronę — stan ma się utrzymać. Kliknij trzy pozycje przełączalne i potwierdź, że:
- „Godziny pracy" chowa i przywraca przygaszenie,
- „Kalendarz Apple" działa dwukierunkowo z przyciskiem „Pokaż/Ukryj Apple" w toolbarze (kliknięcie w jednym miejscu zmienia wygląd drugiego),
- „Happy Hour" działa dwukierunkowo z „Pokaż/Ukryj HH".

- [ ] **Step 6: Kafle wizyt**

Znajdź lub utwórz wizyty 30-, 60- i 120-minutowe. Oczekiwane: 30 min → godzina + nazwisko; 60 min → dodatkowo usługa; 120 min → pełen komplet. Ikony ⚠️ i 📝 widoczne w każdej z nich. Kliknięcie w kafel nadal otwiera panel klientki z kompletem danych.

- [ ] **Step 7: Telefon**

DevTools, szerokość 390 px. Legenda domyślnie zwinięta, toolbar mobilny sprawny, arkusz „Więcej akcji" kompletny, przyciski nadal wysokie na 44 px.

- [ ] **Step 8: Regresja funkcji badge'a Apple**

Badge ❗ na wydarzeniu Apple nadal klikalny i otwiera modal z właściwymi godzinami. Kłódka nadal pokazuje tooltip. Zaznaczanie godzin **pod** wydarzeniem Apple nadal działa.

- [ ] **Step 9: Każdy przycisk toolbara**

Kliknij po kolei: `←`, `Dziś`, `→`, `Dzień`, `Tydzień`, `Lista`, `+ Wizyta`, `+ Klientka z zewnątrz`, `⭐ Happy Hour`, `Ukryj/Pokaż HH`, `Ukryj/Pokaż Apple`, ikonę ustawień. Każdy ma robić dokładnie to, co przed zmianą. Potwierdź też menu godziny (klik w pusty slot) z jego czterema pozycjami oraz popover blokady.

- [ ] **Step 10: Deploy**

Z katalogu `cosmo-app`:

```bash
./deploy.sh frontend
```

- [ ] **Step 11: Sprawdź na produkcji**

Otwórz `https://kosmetologwiktoriacwik.pl/admin/wizyty`, twarde odświeżenie (service worker PWA potrafi trzymać starą wersję), i powtórz kroki 2, 5 i 6.
