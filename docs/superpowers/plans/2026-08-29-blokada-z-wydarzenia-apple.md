# Blokowanie godzin z wydarzenia Apple — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na każdym wydarzeniu z kalendarza Apple w kalendarzu admina pojawia się badge ❗, który otwiera modal blokady z godzinami i tytułem przepisanymi z wydarzenia; gdy godziny są już w pełni zablokowane, badge zmienia się w nieklikalną szarą 🔒.

**Architecture:** Cała zmiana jest po stronie frontendu. Dwie czyste funkcje w nowym pliku `appleCoverage.ts` odpowiadają za rozbicie wydarzenia na kawałki dobowe i za sprawdzenie, czy kawałek jest w pełni pokryty blokadą. `AppleCalendarOverlay` używa ich przy budowaniu eventów FullCalendar i wstawia wynik do `extendedProps`. `CalendarView` renderuje badge w `eventContent` i przy kliknięciu otwiera istniejący `BlockHoursModal`, który dostaje dwa nowe opcjonalne pola prefillu.

**Tech Stack:** React 19, TypeScript, FullCalendar v6 (`@fullcalendar/react`), TanStack Query, date-fns, lucide-react, vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-blokada-z-wydarzenia-apple-design.md`

## Global Constraints

- Wszystkie komendy uruchamiane z katalogu `cosmo-app/apps/web`, chyba że napisano inaczej.
- Testy: `pnpm test` (vitest, konfiguracja już istnieje — patrz `src/lib/axios.test.ts`).
- Warstwa wydarzeń Apple musi pozostać `display: 'background'`. Nie wolno zmienić jej na `'auto'` — inaczej przechwyci `dateClick` i zaznaczanie zakresu, i admin nie zaznaczy godzin pod wydarzeniem.
- Import kalendarza Apple nigdy nie tworzy blokad automatycznie. Blokada powstaje wyłącznie po kliknięciu badge'a i zatwierdzeniu modalu.
- Blokada liczy się jako pokrycie tylko gdy `appliesToAll === true` **i** obejmuje cały kawałek. Pokrycie częściowe oraz blokady per-pracownik zostawiają ❗.
- Kawałek dobowy nigdy nie przechodzi przez północ; górna granica doby to `23:59`.
- Bez zmian w backendzie, bez migracji Prisma, bez nowych zależności.
- Teksty UI po polsku.

---

### Task 1: Czyste funkcje `splitByDay` i `isCoveredByBlock`

**Files:**
- Create: `apps/web/src/components/calendar/appleCoverage.ts`
- Test: `apps/web/src/components/calendar/appleCoverage.test.ts`

**Interfaces:**
- Consumes: `CalendarBlock` z `@/api/calendar-blocks.api` (pola: `startsAt: string`, `endsAt: string`, `appliesToAll: boolean`).
- Produces:
  - `export interface DayChunk { start: Date; end: Date }`
  - `export function splitByDay(start: Date, end: Date): DayChunk[]`
  - `export function isCoveredByBlock(chunk: DayChunk, blocks: CalendarBlock[]): boolean`

- [ ] **Step 1: Write the failing test**

Utwórz `apps/web/src/components/calendar/appleCoverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitByDay, isCoveredByBlock, type DayChunk } from './appleCoverage';
import type { CalendarBlock } from '@/api/calendar-blocks.api';

const d = (iso: string) => new Date(iso);

const block = (partial: Partial<CalendarBlock>): CalendarBlock => ({
  id: 'b1',
  startsAt: '2026-09-03T00:00:00',
  endsAt: '2026-09-03T23:59:00',
  reason: null,
  appliesToAll: true,
  employees: [],
  ...partial,
});

describe('splitByDay', () => {
  it('zwraca jeden nietknięty kawałek dla wydarzenia w obrębie doby', () => {
    const chunks = splitByDay(d('2026-09-03T14:00:00'), d('2026-09-03T16:30:00'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start.toISOString()).toBe(d('2026-09-03T14:00:00').toISOString());
    expect(chunks[0].end.toISOString()).toBe(d('2026-09-03T16:30:00').toISOString());
  });

  it('rozbija wydarzenie trzydniowe na trzy kawałki', () => {
    const chunks = splitByDay(d('2026-09-03T22:00:00'), d('2026-09-05T10:00:00'));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].start.getHours()).toBe(22);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
    expect(chunks[1].start.getDate()).toBe(4);
    expect(chunks[1].start.getHours()).toBe(0);
    expect(chunks[2].start.getDate()).toBe(5);
    expect(chunks[2].end.getHours()).toBe(10);
  });

  it('wydarzenie całodniowe daje jeden kawałek 00:00–23:59, bez pustego dnia następnego', () => {
    const chunks = splitByDay(d('2026-09-03T00:00:00'), d('2026-09-04T00:00:00'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start.getDate()).toBe(3);
    expect(chunks[0].end.getDate()).toBe(3);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
  });

  it('żaden kawałek nie przekracza granicy doby', () => {
    const chunks = splitByDay(d('2026-09-03T08:00:00'), d('2026-09-06T09:00:00'));
    for (const c of chunks) {
      expect(c.start.getDate()).toBe(c.end.getDate());
    }
  });

  it('zwraca pustą listę gdy koniec nie jest późniejszy niż początek', () => {
    expect(splitByDay(d('2026-09-03T10:00:00'), d('2026-09-03T10:00:00'))).toEqual([]);
    expect(splitByDay(d('2026-09-03T10:00:00'), d('2026-09-03T09:00:00'))).toEqual([]);
  });
});

describe('isCoveredByBlock', () => {
  const chunk: DayChunk = { start: d('2026-09-03T14:00:00'), end: d('2026-09-03T16:30:00') };

  it('blokada całego salonu obejmująca kawałek daje true', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T13:00:00', endsAt: '2026-09-03T18:00:00',
    })])).toBe(true);
  });

  it('blokada o krańcach równych krańcom kawałka daje true', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T14:00:00', endsAt: '2026-09-03T16:30:00',
    })])).toBe(true);
  });

  it('blokada pokrywająca kawałek częściowo daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T14:00:00', endsAt: '2026-09-03T15:00:00',
    })])).toBe(false);
  });

  it('blokada per-pracownik obejmująca cały kawałek daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T13:00:00', endsAt: '2026-09-03T18:00:00',
      appliesToAll: false, employees: [{ id: 'e1', name: 'Ala' }],
    })])).toBe(false);
  });

  it('blokada kończąca się dokładnie na początku kawałka daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T10:00:00', endsAt: '2026-09-03T14:00:00',
    })])).toBe(false);
  });

  it('pusta lista blokad daje false', () => {
    expect(isCoveredByBlock(chunk, [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/calendar/appleCoverage.test.ts`
Expected: FAIL — `Failed to resolve import "./appleCoverage"`.

- [ ] **Step 3: Write minimal implementation**

Utwórz `apps/web/src/components/calendar/appleCoverage.ts`:

```ts
import type { CalendarBlock } from '@/api/calendar-blocks.api';

export interface DayChunk {
  start: Date;
  end: Date;
}

// Zabezpieczenie przed pętlą bez końca przy absurdalnie długim wydarzeniu —
// okno synchronizacji to −30/+120 dni, więc rok z zapasem wystarczy.
const MAX_CHUNKS = 400;

/**
 * Tnie wydarzenie na kawałki nieprzechodzące przez północ.
 *
 * Kawałek kończy się o 23:59, bo BlockHoursModal operuje na jednej dacie
 * i nie obsługuje blokad przez północ. Dzięki temu wydarzenie całodniowe
 * z iCloud (00:00 → 00:00 dnia następnego) daje dokładnie jeden kawałek
 * 00:00–23:59, a nie dwa, z których drugi byłby pusty.
 */
export function splitByDay(start: Date, end: Date): DayChunk[] {
  const chunks: DayChunk[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return chunks;
  if (end.getTime() <= start.getTime()) return chunks;

  let cursor = new Date(start);
  while (cursor.getTime() < end.getTime() && chunks.length < MAX_CHUNKS) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);

    let chunkEnd: Date;
    if (end.getTime() < nextMidnight.getTime()) {
      chunkEnd = new Date(end);
    } else {
      chunkEnd = new Date(cursor);
      chunkEnd.setHours(23, 59, 0, 0);
    }

    if (chunkEnd.getTime() > cursor.getTime()) {
      chunks.push({ start: new Date(cursor), end: chunkEnd });
    }
    cursor = nextMidnight;
  }

  return chunks;
}

/**
 * Czy kawałek jest w pełni pokryty blokadą obejmującą cały salon.
 *
 * Pokrycie częściowe i blokady dotyczące wybranych pracownic nie liczą się —
 * wydarzenie Apple jest prywatnym wydarzeniem właścicielki, więc
 * "zabezpieczone" znaczy: cały salon nie przyjmuje zapisów w tych godzinach.
 */
export function isCoveredByBlock(chunk: DayChunk, blocks: CalendarBlock[]): boolean {
  const s = chunk.start.getTime();
  const e = chunk.end.getTime();
  return blocks.some((b) => {
    if (!b.appliesToAll) return false;
    const bs = new Date(b.startsAt).getTime();
    const be = new Date(b.endsAt).getTime();
    if (Number.isNaN(bs) || Number.isNaN(be)) return false;
    return bs <= s && be >= e;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/calendar/appleCoverage.test.ts`
Expected: PASS — 11 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/appleCoverage.ts apps/web/src/components/calendar/appleCoverage.test.ts
git commit -m "feat(kalendarz): funkcje rozbicia wydarzeń Apple na dni i wykrywania pokrycia blokadą"
```

---

### Task 2: Prefill końca i powodu w `BlockHoursModal`

**Files:**
- Modify: `apps/web/src/components/calendar/BlockHoursModal.tsx:8-14` (typ `Props`), `:33-35` (stany `to`, `reason`)

**Interfaces:**
- Consumes: nic z Taska 1.
- Produces: `BlockHoursModal` przyjmuje `prefill: { date: string; time?: string; endTime?: string; employeeId?: string; reason?: string }`. Pola `endTime` i `reason` są opcjonalne, a ich brak daje dokładnie dzisiejsze zachowanie.

- [ ] **Step 1: Rozszerz typ `Props`**

W `BlockHoursModal.tsx` zamień:

```ts
  prefill: { date: string; time?: string; employeeId?: string };
```

na:

```ts
  prefill: { date: string; time?: string; endTime?: string; employeeId?: string; reason?: string };
```

- [ ] **Step 2: Użyj nowych pól jako wartości początkowych**

Zamień:

```ts
  const [to, setTo] = useState(addMinutesToTime(startTimeDefault, 60));
  const [reason, setReason] = useState('');
```

na:

```ts
  // Modal jest odmontowywany, gdy blockModal === null (CalendarView renderuje go
  // warunkowo), więc useState przy każdym otwarciu startuje od świeżego prefillu.
  const [to, setTo] = useState(prefill.endTime ?? addMinutesToTime(startTimeDefault, 60));
  const [reason, setReason] = useState(prefill.reason ?? '');
```

- [ ] **Step 3: Sprawdź, że nic się nie zepsuło**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów. Istniejące wywołanie z menu slotu (`CalendarView.tsx:436`) nie przekazuje `endTime` ani `reason`, więc nadal kompiluje się i zachowuje jak dotąd.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/BlockHoursModal.tsx
git commit -m "feat(kalendarz): BlockHoursModal przyjmuje prefill godziny końca i powodu"
```

---

### Task 3: Rozbicie na dni i flaga pokrycia w `AppleCalendarOverlay`

**Files:**
- Modify: `apps/web/src/components/calendar/AppleCalendarOverlay.tsx` (cały plik)

**Interfaces:**
- Consumes: `splitByDay`, `isCoveredByBlock`, `DayChunk` z Taska 1; `CalendarBlock` z `@/api/calendar-blocks.api`.
- Produces: `AppleCalendarOverlay` ma nowy **wymagany** prop `blocks: CalendarBlock[]`. Każdy wygenerowany `EventInput` ma w `extendedProps`: `appleEventId: string`, `title: string`, `appleStart: Date`, `appleEnd: Date`, `appleTitle: string`, `appleCovered: boolean`.

- [ ] **Step 1: Dodaj importy i prop `blocks`**

W `AppleCalendarOverlay.tsx` dopisz do importów:

```ts
import { useEffect, useMemo } from 'react';
import type { CalendarBlock } from '@/api/calendar-blocks.api';
import { splitByDay, isCoveredByBlock } from './appleCoverage';
```

(linia 1 `import { useEffect } from 'react';` zostaje zastąpiona wersją z `useMemo`)

W interfejsie `Props` dopisz pole:

```ts
  blocks: CalendarBlock[];
```

i dodaj `blocks` do destrukturyzacji argumentów komponentu:

```ts
export function AppleCalendarOverlay({
  rangeStart, rangeEnd, employees, isResourceView, enabled, blocks, children,
}: Props) {
```

- [ ] **Step 2: Zamień budowanie eventów na wersję rozbijającą na dni**

Zamień cały blok `const events: EventInput[] = enabled ? … : [];` (linie 36–60) na:

```ts
  const events: EventInput[] = useMemo(() => {
    if (!enabled) return [];
    return raw.flatMap((ev) => {
      // Wydarzenie wielodniowe rozpada się na kawałki dobowe: każdy dzień dostaje
      // własny kafel i własny badge, a kafel zna przycięte do doby godziny —
      // dzięki temu modal blokady nie musi zgadywać, w który dzień kliknięto.
      const chunks = splitByDay(new Date(ev.startsAt), new Date(ev.endsAt));
      return chunks.flatMap((chunk, dayIndex) => {
        const base = {
          // display:'background' renderuje event jako tło, niezaznaczalne i nieblokujące
          // kliknięć/układu kolumny (w przeciwieństwie do 'auto', które współdzieli
          // szerokość kolumny z wizytami/blokadami i łapie dateClick/select). FullCalendar v6
          // mimo to stosuje eventContent do zdarzeń tła (BgEvent renderuje przez
          // EventContainer z customGenerator: options.eventContent), więc tytuł i badge
          // się pokażą.
          title: ev.title,
          start: chunk.start,
          end: chunk.end,
          display: 'background' as const,
          color: 'rgba(107,114,128,0.20)',
          extendedProps: {
            appleEventId: ev.id,
            title: ev.title,
            appleStart: chunk.start,
            appleEnd: chunk.end,
            appleTitle: ev.title,
            appleCovered: isCoveredByBlock(chunk, blocks),
          },
        };
        // W widoku zasobów event bez resourceId nie zostanie wyrysowany —
        // powielamy go na wszystkie kolumny pracowników.
        if (!isResourceView) return [{ ...base, id: `apple-${ev.id}-${dayIndex}` }];
        return employees.map((emp: any) => ({
          ...base,
          id: `apple-${ev.id}-${dayIndex}-${emp.id}`,
          resourceId: emp.id,
        }));
      });
    });
  }, [enabled, raw, blocks, isResourceView, employees]);
```

- [ ] **Step 3: Zweryfikuj typy**

Run: `pnpm exec tsc --noEmit`
Expected: **jeden** błąd w `CalendarView.tsx` — brakujący prop `blocks` w `<AppleCalendarOverlay>`. To oczekiwane, naprawia to Task 4. Żadnych innych błędów.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/AppleCalendarOverlay.tsx
git commit -m "feat(kalendarz): rozbicie wydarzeń Apple na dni i flaga pokrycia blokadą"
```

---

### Task 4: Badge ❗/🔒 w `CalendarView`

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx:168` (typ stanu `blockModal`), `:656-662` (prop `blocks`), `:691-697` (gałąź `eventContent` dla Apple)

**Interfaces:**
- Consumes: `AppleCalendarOverlay` z propem `blocks` oraz `extendedProps` z Taska 3; `BlockHoursModal` z polami `endTime`/`reason` z Taska 2.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Rozszerz typ stanu `blockModal`**

W linii 168 zamień:

```ts
  const [blockModal, setBlockModal] = useState<{ date: string; time?: string; employeeId?: string } | null>(null);
```

na:

```ts
  const [blockModal, setBlockModal] = useState<{ date: string; time?: string; endTime?: string; employeeId?: string; reason?: string } | null>(null);
```

- [ ] **Step 2: Przekaż blokady do overlaya**

W `<AppleCalendarOverlay>` (linia 656) dopisz prop — blokady są już pobrane zapytaniem z linii 272, więc nie dokładamy żadnego requestu:

```tsx
          <AppleCalendarOverlay
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            employees={employees}
            isResourceView={isResourceView}
            enabled={showApple}
            blocks={calendarBlocks}
          >
```

- [ ] **Step 3: Zamień gałąź `eventContent` dla wydarzeń Apple**

Zamień linie 691–697:

```tsx
                        if (arg.event.extendedProps.appleEventId) {
                          return (
                            <div className="px-1 pt-0.5 text-[10px] font-medium text-gray-500 truncate">
                              {arg.event.extendedProps.title}
                            </div>
                          );
                        }
```

na:

```tsx
                        if (arg.event.extendedProps.appleEventId) {
                          const covered = arg.event.extendedProps.appleCovered as boolean;
                          const appleStart = arg.event.extendedProps.appleStart as Date;
                          const appleEnd = arg.event.extendedProps.appleEnd as Date;
                          return (
                            // Warstwa Apple ma zostać przezroczysta dla kliknięć, żeby admin
                            // mógł zaznaczyć godziny pod wydarzeniem — dlatego wrapper gasi
                            // pointer-events, a przywraca je wyłącznie sam badge.
                            <div className="flex items-start gap-1 px-1 pt-0.5" style={{ pointerEvents: 'none' }}>
                              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-500">
                                {arg.event.extendedProps.title}
                              </span>
                              {covered ? (
                                <span
                                  className="mt-px shrink-0 text-gray-400"
                                  title="Godziny są już zablokowane"
                                  aria-label="Godziny są już zablokowane"
                                >
                                  <Lock size={11} />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  title="Zablokuj te godziny"
                                  aria-label="Zablokuj te godziny"
                                  style={{ pointerEvents: 'auto' }}
                                  className="mt-px shrink-0 rounded px-1 text-[11px] font-bold leading-none text-amber-600 hover:bg-amber-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBlockModal({
                                      date: format(appleStart, 'yyyy-MM-dd'),
                                      time: format(appleStart, 'HH:mm'),
                                      endTime: format(appleEnd, 'HH:mm'),
                                      reason: arg.event.extendedProps.appleTitle as string,
                                    });
                                  }}
                                >
                                  ❗
                                </button>
                              )}
                            </div>
                          );
                        }
```

`format` i `Lock` są już zaimportowane w tym pliku (linie 12 i 15).

- [ ] **Step 4: Zweryfikuj typy i build**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów — w szczególności zniknął błąd o brakującym propie `blocks` z Taska 3.

Run: `pnpm vitest run src/components/calendar/appleCoverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): badge blokowania godzin na wydarzeniach Apple"
```

---

### Task 5: Weryfikacja w przeglądarce i deploy

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże problem.

**Interfaces:**
- Consumes: wszystko z Tasków 1–4.
- Produces: działająca funkcja na produkcji.

- [ ] **Step 1: Uruchom aplikację**

Z katalogu `cosmo-app`: `pnpm dev`, otwórz `http://localhost:5173/admin/wizyty`, zaloguj się jako admin, przełącz na widok kalendarza i upewnij się, że przełącznik „Pokaż Apple" jest włączony.

Jeśli w bazie nie ma wydarzeń Apple, skonfiguruj źródło ikoną koła zębatego w toolbarze i kliknij „Synchronizuj teraz".

- [ ] **Step 2: Sprawdź klikalność badge'a**

Kliknij ❗ na wydarzeniu Apple. Oczekiwane: otwiera się modal „Zablokuj godziny" z datą i godzinami wydarzenia oraz jego tytułem w polu „Powód", z zakresem `● Cały salon`.

**Jeśli klik nie działa:** FullCalendar v6 ustawia `pointer-events: none` wyżej w drzewie, na kontenerze zdarzeń tła. Napraw w `apps/web/src/index.css`, celując wyłącznie w badge, nie w całą warstwę:

```css
/* Badge blokowania na wydarzeniu Apple musi łapać kliknięcia mimo
   pointer-events: none na warstwie zdarzeń tła FullCalendara. */
.fc-bg-event button {
  pointer-events: auto;
  position: relative;
  z-index: 3;
}
```

- [ ] **Step 3: Sprawdź, że warstwa Apple nadal nie blokuje zaznaczania**

Przeciągnij myszką po godzinach *pod* wydarzeniem Apple (poza samym badge'em). Oczekiwane: normalnie otwiera się menu slotu z pozycjami „Dodaj wizytę", „Klientka z zewnątrz", „Happy Hours", „Zablokuj godziny" — tak jak przed zmianą.

- [ ] **Step 4: Sprawdź przejście ❗ → 🔒**

Zapisz blokadę utworzoną w kroku 2. Oczekiwane: kalendarz odświeża się, na wydarzeniu Apple ❗ zmienia się w szarą kłódkę, a pod spodem widać zwykłą, szrafurowaną blokadę.

Następnie kliknij blokadę, usuń ją przyciskiem „Usuń blokadę" i sprawdź, że badge wraca do ❗.

- [ ] **Step 5: Sprawdź wydarzenie wielodniowe**

W kalendarzu Apple utwórz (lub znajdź) wydarzenie całodniowe na 2–3 dni i zsynchronizuj. Oczekiwane: badge pojawia się osobno na każdym dniu, a klik na dowolnym z nich prefilluje modal na `00:00`–`23:59` tego konkretnego dnia.

- [ ] **Step 6: Sprawdź na telefonie**

Otwórz kalendarz admina na wąskim ekranie (DevTools, szerokość 390 px). Oczekiwane: badge pozostaje widoczny mimo skróconego tytułu wydarzenia i da się w niego trafić palcem.

- [ ] **Step 7: Deploy**

Jeśli krok 2 wymagał dopisania reguły CSS, najpierw ją zacommituj:

```bash
git add apps/web/src/index.css
git commit -m "fix(kalendarz): badge Apple łapie kliknięcia mimo warstwy tła"
```

Następnie z katalogu `cosmo-app`:

```bash
./deploy.sh frontend
```

- [ ] **Step 8: Sprawdź na produkcji**

Otwórz `https://kosmetologwiktoriacwik.pl/admin/wizyty` i powtórz kroki 2 i 4 na jednym wydarzeniu.
