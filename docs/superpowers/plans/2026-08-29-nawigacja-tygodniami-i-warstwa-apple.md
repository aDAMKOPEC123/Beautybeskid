# Nawigacja tygodniami i mocniejsza warstwa Apple — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalendarz admina mówi, gdzie się jest w czasie — pasek okresu z miesiącem, zakładkami tygodni i rzędem dni, ze strzałkami przesuwającymi zawsze o tydzień; weekend jest wyróżniony, wydarzenia Apple wyraźnie widoczne i synchronizowane co pięć minut, a oś czasu podpisuje także półgodziny.

**Architecture:** Wyznaczanie tygodni miesiąca to czysty moduł `calendarWeeks.ts` pokryty testami. Pasek okresu to nowy komponent prezentacyjny `CalendarPeriodNav.tsx` sterowany callbackami z `CalendarView`; przyciski nawigacji przenoszą się do niego z obu toolbarów. Wygląd (weekend, Apple, sloty pełnej i pół godziny) trafia do istniejącego `calendar.css`. Częstsza synchronizacja to zmiana schedulera w backendzie plus migracja domyślnej wartości interwału.

**Tech Stack:** React 19, TypeScript, FullCalendar v6, TanStack Query, date-fns, Tailwind, vitest; backend Node/Express + Prisma + PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-08-29-nawigacja-tygodniami-i-warstwa-apple-design.md`

## Global Constraints

- Frontend: komendy z `cosmo-app/apps/web`. Backend: komendy z `cosmo-app/apps/server`.
- Testy frontendu: `pnpm vitest run <ścieżka>` (vitest skonfigurowany; przykłady: `src/components/calendar/calendarLayers.test.ts`).
- **Nic nie znika.** `←`, `→` i `Dziś` zmieniają miejsce i krok, ale zachowują handlery. Każdy pozostały przycisk, widok, modal, menu slotu, popover blokady i badge ❗ działa bez zmian.
- Warstwa Apple **musi pozostać** `display: 'background'` — inaczej przestanie przepuszczać kliknięcia i zepsuje badge ❗ oraz zaznaczanie godzin pod wydarzeniem.
- Tydzień zaczyna się w poniedziałek (polska konwencja, zgodna z `locale="pl"` FullCalendara).
- Strzałki przesuwają o tydzień w **każdym** widoku — przez `incrementDate({ weeks: 1 })`, nie `prev()` / `next()`.
- Tło weekendu musi być delikatniejsze niż przygaszenie godzin poza pracą; obie warstwy nakładają się w weekend poza grafikiem.
- Hierarchia slotów nie może opierać się na klasie `fc-timegrid-slot-minor` — przy `slotLabelInterval` równym `slotDuration` FullCalendar traktuje wszystkie sloty jako główne i ta klasa znika.
- Interwał synchronizacji przycinany do 2–60 minut.
- W toolbarze mobilnym `min-h-11` i `min-w-11` muszą przetrwać wszędzie, gdzie zostają.
- Kolory wyłącznie przez custom properties na `.cosmo-calendar` lub tokeny aplikacji. Bez nowych zależności.
- Teksty UI i komentarze po polsku.

---

### Task 1: Moduł tygodni miesiąca

**Files:**
- Create: `apps/web/src/components/calendar/calendarWeeks.ts`
- Test: `apps/web/src/components/calendar/calendarWeeks.test.ts`

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces:
  - `export interface MonthWeek { start: Date; end: Date; label: string }`
  - `export function startOfWeek(date: Date): Date`
  - `export function weekDays(anchor: Date): Date[]`
  - `export function weeksOfMonth(anchor: Date): MonthWeek[]`

- [ ] **Step 1: Write the failing test**

Utwórz `apps/web/src/components/calendar/calendarWeeks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { startOfWeek, weekDays, weeksOfMonth } from './calendarWeeks';

const d = (iso: string) => new Date(`${iso}T00:00:00`);
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

describe('startOfWeek', () => {
  it('zwraca poniedziałek dla dnia w środku tygodnia', () => {
    // 2026-09-09 to środa
    expect(iso(startOfWeek(d('2026-09-09')))).toBe('2026-09-07');
  });

  it('dla niedzieli zwraca poniedziałek tego samego tygodnia, nie następnego', () => {
    // 2026-09-13 to niedziela
    expect(iso(startOfWeek(d('2026-09-13')))).toBe('2026-09-07');
  });

  it('dla poniedziałku zwraca ten sam dzień', () => {
    expect(iso(startOfWeek(d('2026-09-07')))).toBe('2026-09-07');
  });
});

describe('weekDays', () => {
  it('zwraca siedem kolejnych dni', () => {
    const days = weekDays(d('2026-09-09'));
    expect(days).toHaveLength(7);
    expect(days.map(iso)).toEqual([
      '2026-09-07', '2026-09-08', '2026-09-09',
      '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
    ]);
  });

  it('zaczyna od poniedziałku niezależnie od podanego dnia', () => {
    expect(iso(weekDays(d('2026-09-13'))[0])).toBe('2026-09-07');
    expect(iso(weekDays(d('2026-09-07'))[0])).toBe('2026-09-07');
  });
});

describe('weeksOfMonth', () => {
  it('wrzesień 2026 (1. wypada we wtorek) daje pięć tygodni z przyciętymi etykietami', () => {
    const weeks = weeksOfMonth(d('2026-09-15'));
    expect(weeks.map((w) => w.label)).toEqual(['1–6', '7–13', '14–20', '21–27', '28–30']);
    expect(iso(weeks[0].start)).toBe('2026-08-31'); // tydzień zaczyna się jeszcze w sierpniu
    expect(iso(weeks[0].end)).toBe('2026-09-06');
    expect(iso(weeks[4].end)).toBe('2026-10-04');   // i kończy już w październiku
  });

  it('miesiąc zaczynający się w poniedziałek nie produkuje tygodnia zerowego', () => {
    // czerwiec 2026 zaczyna się w poniedziałek
    const weeks = weeksOfMonth(d('2026-06-15'));
    expect(weeks[0].label).toBe('1–7');
    expect(iso(weeks[0].start)).toBe('2026-06-01');
  });

  it('luty 2026 kończy się etykietą sięgającą 28', () => {
    const weeks = weeksOfMonth(d('2026-02-15'));
    expect(weeks[weeks.length - 1].label).toBe('23–28');
  });

  it('grudzień przycina ostatnią etykietę do 31, mimo że tydzień sięga stycznia', () => {
    const weeks = weeksOfMonth(d('2026-12-15'));
    const last = weeks[weeks.length - 1];
    expect(last.label).toBe('28–31');
    expect(iso(last.end)).toBe('2027-01-03');
  });

  it('jednodniowa resztka miesiąca daje etykietę bez myślnika', () => {
    // 1 lutego 2026 to niedziela — sam koniec tygodnia zaczętego w styczniu
    const weeks = weeksOfMonth(d('2026-02-15'));
    expect(weeks[0].label).toBe('1');
    expect(iso(weeks[0].start)).toBe('2026-01-26');
  });

  it('ten sam tydzień na przełomie miesięcy ma inną etykietę w każdym z nich', () => {
    const wrzesien = weeksOfMonth(d('2026-09-15'));
    const pazdziernik = weeksOfMonth(d('2026-10-15'));
    const ostatniWrzesnia = wrzesien[wrzesien.length - 1];
    const pierwszyPazdziernika = pazdziernik[0];
    expect(iso(ostatniWrzesnia.start)).toBe(iso(pierwszyPazdziernika.start));
    expect(ostatniWrzesnia.label).toBe('28–30');
    expect(pierwszyPazdziernika.label).toBe('1–4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/calendar/calendarWeeks.test.ts`
Expected: FAIL — `Failed to resolve import "./calendarWeeks"`.

- [ ] **Step 3: Write the implementation**

Utwórz `apps/web/src/components/calendar/calendarWeeks.ts`:

```ts
export interface MonthWeek {
  start: Date; // poniedziałek
  end: Date;   // niedziela
  label: string;
}

const atMidnight = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/** Poniedziałek tygodnia zawierającego podaną datę. */
export function startOfWeek(date: Date): Date {
  const d = atMidnight(date);
  const dow = (d.getDay() + 6) % 7; // JS nd=0 → pn=0
  return addDays(d, -dow);
}

/** Siedem dni tygodnia zawierającego kotwicę, od poniedziałku. */
export function weekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Wszystkie tygodnie mające choć jeden dzień w miesiącu kotwicy.
 *
 * Etykieta pokazuje wyłącznie dni należące do tego miesiąca, więc tydzień
 * na przełomie miesięcy pojawia się w obu, ale w każdym opisany swoim
 * wycinkiem — dzięki temu pasek tygodni czyta się jak spis dni miesiąca,
 * a nie jak lista zakresów wychodzących poza niego.
 */
export function weeksOfMonth(anchor: Date): MonthWeek[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDay = lastOfMonth.getDate();

  const weeks: MonthWeek[] = [];
  let cursor = startOfWeek(firstOfMonth);

  while (cursor.getTime() <= lastOfMonth.getTime()) {
    const start = new Date(cursor);
    const end = addDays(cursor, 6);

    const from = start.getMonth() === month ? start.getDate() : 1;
    const to = end.getMonth() === month ? end.getDate() : lastDay;
    weeks.push({ start, end, label: from === to ? `${from}` : `${from}–${to}` });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/calendar/calendarWeeks.test.ts`
Expected: PASS — 11 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/calendarWeeks.ts apps/web/src/components/calendar/calendarWeeks.test.ts
git commit -m "feat(kalendarz): moduł wyznaczania tygodni miesiąca"
```

---

### Task 2: Pasek okresu i przeniesienie nawigacji

**Files:**
- Create: `apps/web/src/components/calendar/CalendarPeriodNav.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (render paska, handlery nawigacji, usunięcie `←`/`→`/`Dziś` z obu toolbarów)

**Interfaces:**
- Consumes: `weeksOfMonth(anchor: Date): MonthWeek[]` i `weekDays(anchor: Date): Date[]` z Taska 1. Typ `MonthWeek` (`{ start: Date; end: Date; label: string }`) jest wnioskowany z wyniku — nie trzeba go importować.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Utwórz komponent**

Utwórz `apps/web/src/components/calendar/CalendarPeriodNav.tsx`:

```tsx
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { weeksOfMonth, weekDays } from './calendarWeeks';

interface Props {
  anchor: Date;
  showDayRow: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onPickDate: (date: Date) => void;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function CalendarPeriodNav({
  anchor, showDayRow, onPrevWeek, onNextWeek, onToday, onPickDate,
}: Props) {
  const weeks = weeksOfMonth(anchor);
  const days = weekDays(anchor);
  const monthLabel = format(anchor, 'LLLL yyyy', { locale: pl });
  const today = new Date();

  return (
    <div className="border-b bg-white px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
          className="min-h-11 min-w-11 rounded-lg bg-secondary text-base text-secondary-foreground hover:bg-accent md:min-h-0 md:min-w-0 md:px-3 md:py-1.5"
        >
          ←
        </button>
        <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
          className="min-h-11 min-w-11 rounded-lg bg-secondary text-base text-secondary-foreground hover:bg-accent md:min-h-0 md:min-w-0 md:px-3 md:py-1.5"
        >
          →
        </button>
        <button
          type="button"
          onClick={onToday}
          className="ml-auto min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 md:min-h-0 md:py-1.5"
        >
          Dziś
        </button>
      </div>

      {/* Zakładki tygodni — na wąskim ekranie przewijalne w poziomie. */}
      <div className="mt-1.5 flex gap-1 overflow-x-auto">
        {weeks.map((w) => {
          const active = anchor.getTime() >= w.start.getTime() && anchor.getTime() <= w.end.getTime();
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              onClick={() => onPickDate(w.start)}
              aria-pressed={active}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium ${
                active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      {showDayRow && (
        <div className="mt-1.5 flex gap-1 overflow-x-auto">
          {days.map((day) => {
            const active = sameDay(day, anchor);
            const weekend = isWeekend(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onPickDate(day)}
                aria-pressed={active}
                className={`flex min-h-11 shrink-0 flex-col items-center rounded-lg px-3 py-1 leading-tight md:min-h-0 ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : weekend
                      ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                <span className="text-[10px] uppercase opacity-80">
                  {format(day, 'EEEEEE', { locale: pl })}
                </span>
                <span className={`text-sm ${sameDay(day, today) ? 'font-bold underline' : 'font-medium'}`}>
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wepnij pasek w CalendarView**

Dopisz import obok pozostałych importów lokalnych:

```ts
import { CalendarPeriodNav } from './CalendarPeriodNav';
```

Dodaj handlery nawigacji obok istniejących funkcji pomocniczych komponentu (np. tuż nad `switchView`):

```ts
  // Strzałki przesuwają o tydzień także w widoku dnia — prev()/next() skakałyby
  // tam o dobę, a pasek okresu jest zbudowany wokół tygodnia jako jednostki.
  const stepWeek = (weeks: number) => calRef.current?.getApi().incrementDate({ weeks });
  const goToDate = (date: Date) => calRef.current?.getApi().gotoDate(date);
```

Wyrenderuj pasek bezpośrednio **nad** `<CalendarLegend …>`:

```tsx
        <CalendarPeriodNav
          anchor={rangeStart}
          showDayRow={view === 'resourceTimeGridDay' || view === 'timeGridDay'}
          onPrevWeek={() => stepWeek(-1)}
          onNextWeek={() => stepWeek(1)}
          onToday={() => calRef.current?.getApi().today()}
          onPickDate={goToDate}
        />
```

- [ ] **Step 3: Usuń nawigację z toolbara desktopowego**

W toolbarze desktopowym usuń **całą pierwszą grupę** wraz z separatorem po niej — czyli blok:

```tsx
          {/* Nawigacja */}
          <div className="flex items-center gap-1">
            <button onClick={() => calRef.current?.getApi().prev()} …>←</button>
            <button onClick={() => calRef.current?.getApi().today()} …>Dziś</button>
            <button onClick={() => calRef.current?.getApi().next()} …>→</button>
          </div>

          <span className="h-6 w-px bg-border" aria-hidden />
```

Toolbar zaczyna się teraz od grupy widoków. Zostaje w nim jeden separator — ten między widokami a akcjami.

- [ ] **Step 4: Usuń nawigację z toolbara mobilnego**

W pasku mobilnym (`<div className="flex items-center gap-1.5 border-b bg-white p-2 md:hidden">`) usuń trzy pierwsze przyciski (`←` z `aria-label="Poprzedni"`, `Dziś`, `→` z `aria-label="Następny"`). Zostaje grupa `Lista` / `Siatka` / „Więcej akcji" — zdejmij z jej kontenera klasę `ml-auto`, bo nie ma już czego odsuwać:

```tsx
        <div className="flex items-center gap-1.5 border-b bg-white p-2 md:hidden">
          <div className="flex gap-1.5">
```

Wszystkie pozostałe przyciski zachowują `min-h-11` / `min-w-11`.

- [ ] **Step 5: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS — testy z Taska 1 i wcześniejszych przechodzą.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/calendar/CalendarPeriodNav.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): pasek okresu z tygodniami i nawigacja co tydzień"
```

---

### Task 3: Półgodziny na osi czasu

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (propy FullCalendara)
- Modify: `apps/web/src/components/calendar/calendar.css` (style slotów)

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces: klasy `cosmo-slot-full` i `cosmo-slot-half` nakładane na tory i etykiety slotów.

- [ ] **Step 1: Dodaj propy FullCalendara**

W `CalendarView.tsx`, obok istniejących `slotMinTime` / `slotMaxTime`, dopisz trzy propy:

```tsx
                  slotLabelInterval="00:30:00"
                  slotLaneClassNames={(arg) => [
                    arg.date.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half',
                  ]}
                  slotLabelClassNames={(arg) => [
                    arg.date.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half',
                  ]}
```

Klasy nadajemy z daty, a nie polegamy na `fc-timegrid-slot-minor`: przy `slotLabelInterval` równym `slotDuration` FullCalendar uznaje wszystkie sloty za główne i ta klasa w ogóle się nie pojawia.

- [ ] **Step 2: Zastąp regułę linii półgodzinnej w calendar.css**

W `calendar.css` zamień istniejącą regułę `.cosmo-calendar .fc-timegrid-slot-minor { … }` oraz regułę `.cosmo-calendar .fc-timegrid-slot-label { … }` na cztery reguły oparte o nowe klasy:

```css
/* Hierarchia osi czasu: pełna godzina jest cięższa i ciemniejsza od półgodziny,
   i to zarówno w podpisie, jak i w grubości linii. Sam styl linii (ciągła vs
   kropkowana) okazał się za słabym sygnałem, żeby policzyć godziny wzrokiem. */
.cosmo-calendar .fc-timegrid-slot.cosmo-slot-full {
  border-top-width: 2px;
  border-top-style: solid;
  border-top-color: hsl(var(--border));
}

.cosmo-calendar .fc-timegrid-slot.cosmo-slot-half {
  border-top-width: 1px;
  border-top-style: dotted;
  border-top-color: hsl(var(--border));
}

.cosmo-calendar .fc-timegrid-slot-label.cosmo-slot-full {
  font-size: 11px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.cosmo-calendar .fc-timegrid-slot-label.cosmo-slot-half {
  font-size: 9px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
}
```

- [ ] **Step 3: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm build`
Expected: build przechodzi, audyt SEO zdany.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx apps/web/src/components/calendar/calendar.css
git commit -m "feat(kalendarz): oś czasu podpisuje półgodziny z wyraźną hierarchią"
```

---

### Task 4: Weekend i mocniejsza warstwa Apple

**Files:**
- Modify: `apps/web/src/components/calendar/calendar.css`
- Modify: `apps/web/src/components/calendar/AppleCalendarOverlay.tsx`

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces: klasa `cosmo-apple-event` na zdarzeniach Apple; custom properties `--cal-apple-bg`, `--cal-apple-stripe`, `--cal-apple-border`, `--cal-apple-text`.

- [ ] **Step 1: Dodaj custom properties i reguły do calendar.css**

W bloku custom properties na `.cosmo-calendar` dopisz cztery zmienne:

```css
  /* Warstwa kalendarza Apple — stłumiony fiolet, nieużywany przez żadną inną
     warstwę kalendarza. Wyraźnie mniej nasycony niż fiolet z palety pracownic
     (#8b5cf6), żeby nie sugerował przynależności do konkretnej osoby. */
  --cal-apple-bg: hsl(265 35% 94%);
  --cal-apple-stripe: hsl(265 30% 86%);
  --cal-apple-border: hsl(265 30% 55%);
  --cal-apple-text: hsl(265 35% 38%);
```

Dopisz na końcu arkusza reguły weekendu i warstwy Apple:

```css
/* --- Weekend --- */

/* Odcień celowo delikatniejszy niż --cal-offhours: w weekend poza godzinami
   pracy obie warstwy się nakładają, a mocne tło zrobiłoby z takiego obszaru
   najciemniejsze miejsce w kalendarzu, sugerując znaczenie, którego nie ma. */
.cosmo-calendar .fc-day-sat,
.cosmo-calendar .fc-day-sun {
  background-color: hsl(35 60% 96%);
}

.cosmo-calendar .fc-col-header-cell.fc-day-sat,
.cosmo-calendar .fc-col-header-cell.fc-day-sun {
  background-color: hsl(35 55% 92%);
  color: hsl(35 45% 30%);
}

/* --- Warstwa kalendarza Apple --- */

/* Prążki pod 135°, czyli przeciwnie niż szrafura blokad (45°) — dzięki temu
   obie warstwy nie mylą się wzrokowo mimo podobnej faktury. */
.cosmo-calendar .fc-bg-event.cosmo-apple-event {
  background-color: var(--cal-apple-bg);
  background-image: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 5px,
    var(--cal-apple-stripe) 5px,
    var(--cal-apple-stripe) 10px
  );
  opacity: 1;
  border-left: 3px solid var(--cal-apple-border);
}

.cosmo-calendar .cosmo-apple-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cal-apple-text);
}
```

- [ ] **Step 2: Nadaj klasę zdarzeniom Apple**

W `AppleCalendarOverlay.tsx`, w obiekcie `base` budowanym dla każdego kawałka, usuń linię ustawiającą kolor i dopisz klasę:

```ts
          display: 'background' as const,
          classNames: ['cosmo-apple-event'],
```

(usuwana linia to `color: 'rgba(107,114,128,0.20)',` — kolor przechodzi w całości do arkusza, żeby był w jednym miejscu)

- [ ] **Step 3: Podepnij klasę podpisu w CalendarView**

W `CalendarView.tsx`, w gałęzi `appleEventId` w `eventContent`, zamień klasę tytułu z bladoszarej na nową. Znajdź:

```tsx
                              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-gray-500">
                                {arg.event.extendedProps.title}
                              </span>
```

i zamień na:

```tsx
                              <span className="cosmo-apple-label min-w-0 flex-1 truncate">
                                {arg.event.extendedProps.title}
                              </span>
```

- [ ] **Step 4: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/calendar.css apps/web/src/components/calendar/AppleCalendarOverlay.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): wyróżniony weekend i mocniejsza warstwa kalendarza Apple"
```

---

### Task 5: Częstsza synchronizacja kalendarza Apple

**Files:**
- Modify: `apps/server/src/modules/external-calendar/external-calendar.service.ts` (funkcja `initializeExternalCalendarSync`)
- Modify: `apps/server/prisma/schema.prisma` (domyślna wartość `syncIntervalMinutes`)
- Create: `apps/server/prisma/migrations/20260829130000_sync_interval_default_5/migration.sql`
- Modify: `apps/web/src/components/calendar/AppleCalendarOverlay.tsx` (opcje zapytania)

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces: nic dla kolejnych tasków.

- [ ] **Step 1: Przepisz scheduler**

W `external-calendar.service.ts` zamień całą funkcję `initializeExternalCalendarSync` na:

```ts
// Dolna granica chroni iCloud przed odpytywaniem częstszym, niż ma sens dla
// kalendarza aktualizowanego ręcznie przez człowieka; górna zabezpiecza przed
// wartością, która praktycznie wyłączyłaby synchronizację.
const MIN_SYNC_MINUTES = 2;
const MAX_SYNC_MINUTES = 60;
const TICK_MS = 60_000;

export const initializeExternalCalendarSync = (): void => {
  // Tick co minutę sprawdza, czy minął interwał zapisany przy źródle. Dzięki
  // temu zmiana interwału w bazie działa bez restartu serwera — inaczej niż
  // przy interwale zaszytym w setInterval.
  const tick = async () => {
    try {
      const source = await getSource();
      if (!source || !source.isEnabled) return;

      const intervalMinutes = Math.min(
        MAX_SYNC_MINUTES,
        Math.max(MIN_SYNC_MINUTES, source.syncIntervalMinutes),
      );
      const dueAt = source.lastSyncedAt
        ? source.lastSyncedAt.getTime() + intervalMinutes * 60_000
        : 0;
      if (Date.now() < dueAt) return;

      const { imported } = await syncNow();
      console.log(`[external-calendar] zsynchronizowano ${imported} wydarzeń`);
    } catch (err: any) {
      console.error('[external-calendar] błąd synchronizacji:', err?.message ?? err);
    }
  };

  void tick();
  setInterval(tick, TICK_MS);
};
```

- [ ] **Step 2: Zmień domyślną wartość w schemacie**

W `apps/server/prisma/schema.prisma`, w modelu `ExternalCalendarSource`, zamień:

```prisma
  syncIntervalMinutes Int      @default(15)
```

na:

```prisma
  syncIntervalMinutes Int      @default(5)
```

- [ ] **Step 3: Utwórz migrację**

Utwórz katalog i plik `apps/server/prisma/migrations/20260829130000_sync_interval_default_5/migration.sql`:

```sql
-- Domyślny interwał synchronizacji kalendarza Apple schodzi z 15 na 5 minut.
ALTER TABLE "ExternalCalendarSource" ALTER COLUMN "syncIntervalMinutes" SET DEFAULT 5;

-- Istniejące źródła, które nigdy nie miały ustawionej własnej wartości,
-- dostają nową domyślną. W MVP jest dokładnie jedno źródło.
UPDATE "ExternalCalendarSource" SET "syncIntervalMinutes" = 5 WHERE "syncIntervalMinutes" = 15;
```

- [ ] **Step 4: Zweryfikuj backend**

Z katalogu `apps/server`:

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`.

Run: `pnpm test`
Expected: istniejąca sada testów backendu przechodzi.

- [ ] **Step 5: Zmień opcje zapytania na froncie**

W `AppleCalendarOverlay.tsx` zamień opcje `useQuery`:

```ts
    staleTime: 5 * 60 * 1000,
    enabled,
```

na:

```ts
    // Serwer synchronizuje co ~5 minut i po każdej synchronizacji wysyła
    // external-calendar:updated, więc otwarty kalendarz odświeża się sam.
    // Te opcje pokrywają drugi przypadek: wejście na stronę i powrót do zakładki.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled,
```

- [ ] **Step 6: Zweryfikuj frontend**

Z katalogu `apps/web`:

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/external-calendar/external-calendar.service.ts apps/server/prisma/schema.prisma apps/server/prisma/migrations apps/web/src/components/calendar/AppleCalendarOverlay.tsx
git commit -m "feat(kalendarz): synchronizacja Apple co 5 minut i odświeżanie przy powrocie do zakładki"
```

---

### Task 6: Weryfikacja w przeglądarce i deploy

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże problem.

**Interfaces:**
- Consumes: wszystko z Tasków 1–5.
- Produces: działająca funkcja na produkcji.

- [ ] **Step 1: Uruchom aplikację**

Z katalogu `cosmo-app`: `pnpm dev`, otwórz `http://localhost:5173/admin/wizyty`, zaloguj się jako admin.

- [ ] **Step 2: Pasek okresu**

Podpis miesiąca zgodny z widoczną datą. Kliknięcie w zakładkę tygodnia przenosi kalendarz, aktywna zakładka podświetlona. Sprawdź miesiąc, w którym pierwszy tydzień zaczyna się jeszcze w poprzednim — etykieta ma pokazywać wyłącznie dni bieżącego miesiąca.

- [ ] **Step 3: Krok tygodniowy**

Strzałki przesuwają o siedem dni w widoku dnia, tygodnia i listy. `Dziś` wraca do dzisiejszej daty w każdym z nich.

- [ ] **Step 4: Rząd dni**

Widoczny wyłącznie w widoku dnia. Kliknięcie w dzień przenosi, aktywny dzień podświetlony, dzisiejszy podkreślony, sobota i niedziela w cieplejszym odcieniu.

- [ ] **Step 5: Weekend w siatce**

W widoku tygodnia sobota i niedziela mają cieplejsze tło i nagłówek. Sprawdź weekend **poza godzinami pracy** — nie może wyjść ciemniejszy niż zwykły dzień poza godzinami pracy.

- [ ] **Step 6: Warstwa Apple**

Wydarzenia wyraźnie widoczne, fioletowe, w prążki pod innym kątem niż blokady. Badge ❗ nadal klikalny i otwiera modal z właściwymi godzinami. Kłódka nadal pokazuje tooltip. Zaznaczanie godzin **pod** wydarzeniem Apple nadal działa.

Jeśli któraś pracownica ma w kalendarzu kolor `#8b5cf6` (fiolet z palety), sprawdź, czy jej kolumna nie myli się z warstwą Apple.

- [ ] **Step 7: Oś czasu**

Podpisy co pół godziny. Pełne godziny większe i pogrubione, półgodziny mniejsze i przygaszone. Linia pełnej godziny wyraźnie grubsza od półgodzinnej.

- [ ] **Step 8: Nic nie zginęło**

Kliknij po kolei każdy pozostały przycisk toolbara: `Dzień`, `Tydzień`, `Lista`, `+ Wizyta`, `+ Klientka z zewnątrz`, `⭐ Happy Hour`, `Ukryj/Pokaż HH`, `Ukryj/Pokaż Apple`, ikonę ustawień. Otwórz menu slotu (klik w pusty slot) i sprawdź jego cztery pozycje. Otwórz popover blokady. Sprawdź legendę i jej trzy przełączniki.

- [ ] **Step 9: Telefon**

DevTools, szerokość 390 px. Pasek okresu czytelny, zakładki tygodni i dni przewijalne w poziomie. Przyciski nadal wysokie na 44 px. Arkusz „Więcej akcji" kompletny.

- [ ] **Step 10: Deploy**

Ta zmiana obejmuje backend i migrację, więc pełny deploy — nie `frontend`:

```bash
./deploy.sh
```

- [ ] **Step 11: Sprawdź synchronizację na produkcji**

Otwórz `https://kosmetologwiktoriacwik.pl/admin/wizyty`, twarde odświeżenie. Dodaj wydarzenie w kalendarzu Apple i sprawdź, czy pojawia się w ciągu ~5 minut bez odświeżania strony. Przełącz się na inną zakładkę i wróć — dane mają się odświeżyć natychmiast.
