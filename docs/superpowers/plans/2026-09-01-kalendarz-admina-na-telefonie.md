# Kalendarz admina na telefonie — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na telefonie nad siatką zostaje jeden rząd zamiast czterech, główne akcje schodzą do paska przy dolnej krawędzi pod kciukiem, a siatka rośnie z pięciu godzin do kilkunastu — bez utraty jakiejkolwiek funkcji.

**Architecture:** Dwie czyste funkcje trafiają do nowego modułu `calendarMobile.ts` i idą pod testy. Układ telefonu obsługują trzy nowe komponenty prezentacyjne — górna belka, arkusz z tygodniami i dolny pasek akcji — sterowane wyłącznie propsami i callbackami z `CalendarView`. Istniejący `CalendarPeriodNav` i mobilny pasek widoków znikają na telefonie; wersja na komputerze pozostaje nietknięta.

**Tech Stack:** React 19, TypeScript, FullCalendar v6, date-fns, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-kalendarz-admina-na-telefonie-design.md`

## Global Constraints

- Komendy z `cosmo-app/apps/web`. Testy: `pnpm vitest run <ścieżka>`.
- **Nic nie znika.** Każda funkcja ma dalej swoje miejsce — zmienia się tylko, czy jest widoczna od razu, czy o jedno tapnięcie. Lista: `Lista`/`Siatka`, nawigacja o tydzień, skok do tygodnia miesiąca, skok do dnia, `Dziś`, wybór pracownicy, dodanie wizyty, klientka z zewnątrz, Happy Hour, przełączniki Happy Hours i Apple, ustawienia Apple, menu godziny z czterema pozycjami, blokady z popoverem, panel klientki, badge ❗.
- **Układ na komputerze bez zmian.** Wszystkie nowe elementy są `md:hidden`, a usuwane — `md:hidden` już dziś.
- Wysokości dotykowe: każdy klikalny element ma co najmniej `min-h-11` (44 px).
- Dolny pasek respektuje `env(safe-area-inset-bottom)` — bez tego na iPhonie wchodzi pod wskaźnik gestu.
- Obszar przewijania kalendarza dostaje dolny odstęp, żeby ostatnia godzina nie chowała się za paskiem.
- Kolory wyłącznie przez tokeny aplikacji (`bg-primary`, `bg-secondary`, `hover:bg-accent`), nie surowy Tailwind.
- Bez nowych zależności. Teksty UI i komentarze po polsku.

---

### Task 1: Moduł funkcji telefonu i naprawa klucza legendy

**Files:**
- Create: `apps/web/src/components/calendar/calendarMobile.ts`
- Test: `apps/web/src/components/calendar/calendarMobile.test.ts`
- Modify: `apps/web/src/components/calendar/calendarWeeks.ts` (eksport `toDay`)
- Modify: `apps/web/src/components/calendar/calendarWeeks.test.ts` (test `toDay`)
- Modify: `apps/web/src/components/calendar/CalendarLegend.tsx` (klucz zależny od szerokości, użycie `toDay` nie dotyczy tego pliku)
- Modify: `apps/web/src/components/calendar/CalendarPeriodNav.tsx` (użycie wspólnego `toDay`)

**Interfaces:**
- Consumes: `weeksOfMonth`, `weekDays` z `calendarWeeks.ts` (istnieją).
- Produces:
  - `export function shouldShowTodayButton(anchor: Date, today: Date): boolean`
  - `export function storageKeyFor(isMobile: boolean): string`
  - `export function toDay(date: Date): Date` — eksportowana z `calendarWeeks.ts`

- [ ] **Step 1: Write the failing test**

Utwórz `apps/web/src/components/calendar/calendarMobile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shouldShowTodayButton, storageKeyFor } from './calendarMobile';

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h);

describe('shouldShowTodayButton', () => {
  it('nie pokazuje przycisku, gdy stoimy na dzisiejszym dniu', () => {
    expect(shouldShowTodayButton(at(2026, 8, 3), at(2026, 8, 3))).toBe(false);
  });

  it('pokazuje przycisk dla innego dnia', () => {
    expect(shouldShowTodayButton(at(2026, 8, 10), at(2026, 8, 3))).toBe(true);
  });

  it('inna godzina tego samego dnia to nadal dzisiaj — porównujemy datę, nie sygnaturę czasu', () => {
    expect(shouldShowTodayButton(at(2026, 8, 3, 23), at(2026, 8, 3, 1))).toBe(false);
  });

  it('dzień wcześniej i dzień później pokazują przycisk', () => {
    expect(shouldShowTodayButton(at(2026, 8, 2), at(2026, 8, 3))).toBe(true);
    expect(shouldShowTodayButton(at(2026, 8, 4), at(2026, 8, 3))).toBe(true);
  });

  it('ten sam dzień i miesiąc w innym roku pokazuje przycisk', () => {
    expect(shouldShowTodayButton(at(2027, 8, 3), at(2026, 8, 3))).toBe(true);
  });
});

describe('storageKeyFor', () => {
  it('telefon i komputer maja rozne klucze', () => {
    expect(storageKeyFor(true)).not.toBe(storageKeyFor(false));
  });

  it('klucz komputera zostaje ten, ktory juz jest w uzyciu u uzytkownikow', () => {
    expect(storageKeyFor(false)).toBe('cosmo-calendar-legend-open');
  });

  it('klucz telefonu jest wlasny', () => {
    expect(storageKeyFor(true)).toBe('cosmo-calendar-legend-open-mobile');
  });
});
```

Dopisz też do `apps/web/src/components/calendar/calendarWeeks.test.ts`, na końcu pliku, przed zamykającym nawiasem ostatniego `describe` — a jeśli prościej, jako nowy blok na końcu pliku:

```ts
describe('toDay', () => {
  it('zeruje godzine, zostawiajac date kalendarzowa', () => {
    const out = toDay(new Date(2026, 8, 3, 14, 37, 12, 500));
    expect(out.getFullYear()).toBe(2026);
    expect(out.getMonth()).toBe(8);
    expect(out.getDate()).toBe(3);
    expect(out.getHours()).toBe(0);
    expect(out.getMinutes()).toBe(0);
    expect(out.getSeconds()).toBe(0);
    expect(out.getMilliseconds()).toBe(0);
  });

  it('nie modyfikuje daty podanej przez wywolujacego', () => {
    const input = new Date(2026, 8, 3, 14, 0, 0);
    const before = input.getTime();
    toDay(input);
    expect(input.getTime()).toBe(before);
  });
});
```

i rozszerz istniejący import w tym pliku o `toDay`:

```ts
import { startOfWeek, weekDays, weeksOfMonth, toDay } from './calendarWeeks';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/calendar/calendarMobile.test.ts src/components/calendar/calendarWeeks.test.ts`
Expected: FAIL — brak modułu `./calendarMobile` oraz brak eksportu `toDay`.

- [ ] **Step 3: Utwórz moduł funkcji telefonu**

Utwórz `apps/web/src/components/calendar/calendarMobile.ts`:

```ts
/**
 * Czy pokazać przycisk „Dziś".
 *
 * Pokazujemy go wyłącznie wtedy, gdy nie stoimy na dzisiejszym dniu — zabierałby
 * miejsce dokładnie w chwili, w której jest niepotrzebny, a na telefonie każdy
 * element górnej belki konkuruje o tę samą szerokość.
 */
export function shouldShowTodayButton(anchor: Date, today: Date): boolean {
  return (
    anchor.getFullYear() !== today.getFullYear() ||
    anchor.getMonth() !== today.getMonth() ||
    anchor.getDate() !== today.getDate()
  );
}

/**
 * Klucz zapamiętywania stanu legendy.
 *
 * Telefon i komputer mają osobne klucze, bo mają nieporównywalne budżety
 * wysokości: legenda rozwinięta na komputerze zabierała na telefonie 90 px
 * z około 200 px dostępnych na siatkę. Klucz komputera zostaje bez zmian, żeby
 * nie skasować wyboru, który użytkownicy już zapisali.
 */
export function storageKeyFor(isMobile: boolean): string {
  return isMobile ? 'cosmo-calendar-legend-open-mobile' : 'cosmo-calendar-legend-open';
}
```

- [ ] **Step 4: Wyeksportuj `toDay` z calendarWeeks.ts**

W `apps/web/src/components/calendar/calendarWeeks.ts` zamień prywatną funkcję `atMidnight` na eksportowaną `toDay` i podmień jej użycia w tym pliku:

```ts
/** Ta sama data o północy. Zwraca nowy obiekt — nie modyfikuje argumentu. */
export function toDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
```

Wszystkie dotychczasowe wywołania `atMidnight(...)` w tym pliku zamień na `toDay(...)`.

- [ ] **Step 5: Użyj wspólnego `toDay` w CalendarPeriodNav**

W `apps/web/src/components/calendar/CalendarPeriodNav.tsx` zamień lokalne wyliczenie:

```ts
  const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
```

na wywołanie wspólnej funkcji, dopisując ją do istniejącego importu:

```ts
import { weeksOfMonth, weekDays, toDay } from './calendarWeeks';
```

```ts
  const anchorDay = toDay(anchor);
```

Komentarz nad tą linią zostaje bez zmian — wyjaśnia, po co normalizacja istnieje.

- [ ] **Step 6: Napraw klucz legendy**

W `apps/web/src/components/calendar/CalendarLegend.tsx` usuń stałą:

```ts
const STORAGE_KEY = 'cosmo-calendar-legend-open';
```

dopisz import:

```ts
import { storageKeyFor } from './calendarMobile';
```

i wewnątrz komponentu, gdzie `isMobile` jest już dostępne, wylicz klucz oraz podmień oba jego użycia:

```ts
  // Osobny klucz dla telefonu: legenda rozwinięta na komputerze zabierała tam
  // 90 px z około 200 px, które w ogóle zostawały na siatkę.
  const storageKey = storageKeyFor(isMobile);
```

W `useEffect` czytającym stan: `localStorage.getItem(storageKey)`.
W `toggleOpen` zapisującym stan: `localStorage.setItem(storageKey, prev ? '0' : '1')`.

Dopisz `storageKey` do tablicy zależności `useEffect`, żeby zmiana szerokości ekranu przeładowała właściwy stan.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS — dotychczasowe testy plus 8 nowych z `calendarMobile.test.ts` i 2 z `calendarWeeks.test.ts`.

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/calendar/calendarMobile.ts apps/web/src/components/calendar/calendarMobile.test.ts apps/web/src/components/calendar/calendarWeeks.ts apps/web/src/components/calendar/calendarWeeks.test.ts apps/web/src/components/calendar/CalendarPeriodNav.tsx apps/web/src/components/calendar/CalendarLegend.tsx
git commit -m "fix(kalendarz): osobny stan legendy na telefonie i wspolny helper daty"
```

---

### Task 2: Arkusz z tygodniami miesiąca

**Files:**
- Create: `apps/web/src/components/calendar/CalendarWeekPickerSheet.tsx`

**Interfaces:**
- Consumes: `weeksOfMonth`, `toDay` z `calendarWeeks.ts`; istniejący `MobileSheet` (props: `open`, `onClose`, `title?`, `children`).
- Produces: `export function CalendarWeekPickerSheet(props: { open: boolean; anchor: Date; onClose: () => void; onPickDate: (date: Date) => void })`

- [ ] **Step 1: Utwórz komponent**

Utwórz `apps/web/src/components/calendar/CalendarWeekPickerSheet.tsx`:

```tsx
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MobileSheet } from './MobileSheet';
import { weeksOfMonth, toDay } from './calendarWeeks';

interface Props {
  open: boolean;
  anchor: Date;
  onClose: () => void;
  onPickDate: (date: Date) => void;
}

/**
 * Zakładki tygodni miesiąca, przeniesione z górnej belki do arkusza.
 *
 * Na telefonie ten rząd kosztował 52 px stale, a używa się go rzadko — skok
 * o tydzień robią strzałki. W arkuszu jest o jedno tapnięcie i nie zabiera
 * miejsca siatce.
 */
export function CalendarWeekPickerSheet({ open, anchor, onClose, onPickDate }: Props) {
  if (!open) return null;

  const anchorDay = toDay(anchor);
  const weeks = weeksOfMonth(anchorDay);

  return (
    <MobileSheet open={open} onClose={onClose} title={format(anchorDay, 'LLLL yyyy', { locale: pl })}>
      <div className="grid grid-cols-2 gap-2">
        {weeks.map((w) => {
          const active =
            anchorDay.getTime() >= w.start.getTime() && anchorDay.getTime() <= w.end.getTime();
          return (
            <button
              key={w.start.toISOString()}
              type="button"
              onClick={() => { onPickDate(w.start); onClose(); }}
              aria-pressed={active}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>
    </MobileSheet>
  );
}
```

- [ ] **Step 2: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów. (Komponent nie jest jeszcze nigdzie użyty — to normalne, wpina go kolejny task.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/calendar/CalendarWeekPickerSheet.tsx
git commit -m "feat(kalendarz): arkusz z tygodniami miesiaca na telefonie"
```

---

### Task 3: Górna belka telefonu

**Files:**
- Create: `apps/web/src/components/calendar/CalendarMobileBar.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (render belki i arkusza, ukrycie `CalendarPeriodNav` na telefonie)

**Interfaces:**
- Consumes: `shouldShowTodayButton` z Taska 1; `weekDays`, `toDay` z `calendarWeeks.ts`; `CalendarWeekPickerSheet` z Taska 2.
- Produces: `export function CalendarMobileBar(props: {...})` — sygnatura poniżej.

- [ ] **Step 1: Utwórz komponent**

Utwórz `apps/web/src/components/calendar/CalendarMobileBar.tsx`:

```tsx
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronDown, Info } from 'lucide-react';
import { weekDays, toDay } from './calendarWeeks';
import { shouldShowTodayButton } from './calendarMobile';

interface Props {
  anchor: Date;
  employees: any[];
  zoomedEmployeeId: string | null;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onPickDate: (date: Date) => void;
  onOpenWeekPicker: () => void;
  onToggleLegend: () => void;
  onPickEmployee: (employeeId: string) => void;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

const CONTROL = 'h-11 shrink-0 rounded-lg font-medium';

/**
 * Górna belka kalendarza na telefonie: jeden rząd sterowania i jeden rząd dni.
 *
 * Zastępuje cztery rzędy, które zajmowały około 260 px z ekranu — pasek widoków,
 * rząd miesiąca, zakładki tygodni i wysoki nagłówek z awatarem pracownicy.
 * Nazwa miesiąca czytana jest z daty, zakładki tygodni przeniosły się do arkusza
 * otwieranego tą datą, a tożsamość pracownicy stoi tutaj zamiast nad siatką.
 */
export function CalendarMobileBar({
  anchor, employees, zoomedEmployeeId,
  onPrevWeek, onNextWeek, onToday, onPickDate, onOpenWeekPicker, onToggleLegend, onPickEmployee,
}: Props) {
  const anchorDay = toDay(anchor);
  const days = weekDays(anchorDay);
  const today = new Date();
  const showToday = shouldShowTodayButton(anchorDay, today);

  return (
    <div className="border-b bg-white px-2 py-1 md:hidden">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground`}
        >
          ←
        </button>

        <button
          type="button"
          onClick={onOpenWeekPicker}
          className={`${CONTROL} flex min-w-0 flex-1 items-center justify-center gap-1 bg-secondary px-2 text-sm text-secondary-foreground`}
        >
          <span className="truncate">{format(anchorDay, 'EEE, d MMM', { locale: pl })}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>

        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
          className={`${CONTROL} w-11 bg-secondary text-base text-secondary-foreground`}
        >
          →
        </button>

        {/* „Dziś" pojawia się tylko poza dzisiejszym dniem — inaczej zabierałby
            szerokość dokładnie wtedy, gdy jest niepotrzebny. */}
        {showToday && (
          <button
            type="button"
            onClick={onToday}
            className={`${CONTROL} bg-primary px-3 text-sm text-primary-foreground`}
          >
            Dziś
          </button>
        )}

        <button
          type="button"
          onClick={onToggleLegend}
          aria-label="Legenda"
          className={`${CONTROL} w-11 bg-secondary text-secondary-foreground`}
        >
          <Info size={16} className="mx-auto" />
        </button>
      </div>

      {/* Wybór pracownicy. Przy jednej osobie sama nazwa — lista rozwijana
          udawałaby wybór, którego nie ma. Przy wielu natywny <select>, bo na
          telefonie otwiera systemowy wybierak i działa lepiej niż własne menu. */}
      {employees.length === 1 && (
        <p className="mt-1 truncate px-1 text-xs font-medium text-muted-foreground">
          {employees[0].name}
        </p>
      )}
      {employees.length > 1 && (
        <select
          value={zoomedEmployeeId ?? ''}
          onChange={(e) => onPickEmployee(e.target.value)}
          aria-label="Pracownica"
          className="mt-1 h-11 w-full rounded-lg border border-border bg-secondary px-2 text-sm font-medium text-secondary-foreground"
        >
          {employees.map((emp: any) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      )}

      <div className="mt-1 flex gap-1">
        {days.map((day) => {
          const active = sameDay(day, anchorDay);
          const weekend = isWeekend(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPickDate(day)}
              aria-pressed={active}
              className={`flex h-11 flex-1 flex-col items-center justify-center rounded-lg leading-tight ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : weekend
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-secondary text-secondary-foreground'
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
    </div>
  );
}
```

- [ ] **Step 2: Wepnij belkę i arkusz w CalendarView**

Dopisz importy:

```ts
import { CalendarMobileBar } from './CalendarMobileBar';
import { CalendarWeekPickerSheet } from './CalendarWeekPickerSheet';
```

Dodaj **oba** stany obok pozostałych stanów komponentu — drugi z nich jest używany
już w tym kroku, więc musi powstać razem z pierwszym:

```ts
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  // Belka telefonu przełącza legendę, której stan mieszka w CalendarLegend.
  // Zwiększany licznik jest sygnałem „przełącz się" — prostszym niż podnoszenie
  // całego stanu w górę tylko po to, żeby jeden przycisk mógł go dotknąć.
  const [legendOpenSignal, setLegendOpenSignal] = useState(0);
```

Ukryj `CalendarPeriodNav` na telefonie — dodaj wokół niego opakowanie:

```tsx
        <div className="hidden md:block">
          <CalendarPeriodNav
            anchor={rangeStart}
            showDayRow={view === 'resourceTimeGridDay' || view === 'timeGridDay'}
            onPrevWeek={() => stepWeek(-1)}
            onNextWeek={() => stepWeek(1)}
            onToday={() => calRef.current?.getApi().today()}
            onPickDate={goToDate}
          />
        </div>
```

(zachowaj dokładnie te propsy, które są dziś — powyżej pokazany jest ich obecny kształt)

Bezpośrednio pod tym opakowaniem wyrenderuj belkę telefonu:

```tsx
        <CalendarMobileBar
          anchor={rangeStart}
          employees={employees}
          zoomedEmployeeId={zoomedEmployeeId}
          onPrevWeek={() => stepWeek(-1)}
          onNextWeek={() => stepWeek(1)}
          onToday={() => calRef.current?.getApi().today()}
          onPickDate={goToDate}
          onOpenWeekPicker={() => setWeekPickerOpen(true)}
          onToggleLegend={() => setLegendOpenSignal((n) => n + 1)}
          onPickEmployee={(id) => zoomToEmployee(id)}
        />
```

- [ ] **Step 3: Podepnij przełącznik legendy**

`CalendarLegend` trzyma stan rozwinięcia u siebie, a belka musi go przełączać z zewnątrz. Licznik sygnału został zadeklarowany w kroku 2; teraz przekaż go do legendy nowym propem:

```tsx
        <CalendarLegend
          toggleSignal={legendOpenSignal}
          showWorkingHours={showWorkingHours}
          ...
        />
```

(pozostałe propsy zostaw dokładnie takie, jakie są dziś)

W `CalendarLegend.tsx` dodaj prop do interfejsu `Props`:

```ts
  /** Zmiana wartości przełącza rozwinięcie — sygnał z górnej belki telefonu. */
  toggleSignal?: number;
```

i reaguj na nią, pomijając pierwsze uruchomienie:

```ts
  const firstSignal = useRef(true);
  useEffect(() => {
    if (firstSignal.current) { firstSignal.current = false; return; }
    setOpen((prev) => {
      localStorage.setItem(storageKey, prev ? '0' : '1');
      return !prev;
    });
  }, [toggleSignal, storageKey]);
```

Dopisz `useRef` do importu React w tym pliku.

- [ ] **Step 4: Wyrenderuj arkusz z tygodniami**

Obok pozostałych modali na końcu komponentu:

```tsx
      <CalendarWeekPickerSheet
        open={weekPickerOpen}
        anchor={rangeStart}
        onClose={() => setWeekPickerOpen(false)}
        onPickDate={goToDate}
      />
```

- [ ] **Step 5: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/calendar/CalendarMobileBar.tsx apps/web/src/components/calendar/CalendarView.tsx apps/web/src/components/calendar/CalendarLegend.tsx
git commit -m "feat(kalendarz): jednorzedowa gorna belka na telefonie"
```

---

### Task 4: Dolny pasek akcji

**Files:**
- Create: `apps/web/src/components/calendar/CalendarMobileActions.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx` (render paska, usunięcie mobilnego paska widoków, odstęp dolny, wymuszenie `timeGridDay`, usunięcie „Dodaj wizytę" z arkusza)

**Interfaces:**
- Consumes: nic z wcześniejszych tasków.
- Produces: `export function CalendarMobileActions(props: { isListView: boolean; onGrid: () => void; onList: () => void; onAdd: () => void; onMore: () => void })`

- [ ] **Step 1: Utwórz komponent**

Utwórz `apps/web/src/components/calendar/CalendarMobileActions.tsx`:

```tsx
import { CalendarPlus, List, LayoutGrid, MoreHorizontal } from 'lucide-react';

interface Props {
  isListView: boolean;
  onGrid: () => void;
  onList: () => void;
  onAdd: () => void;
  onMore: () => void;
}

/**
 * Pasek akcji przy dolnej krawędzi.
 *
 * Na telefonie górna część ekranu jest najtrudniejsza do dosięgnięcia kciukiem
 * jedną ręką, a dotąd leżały tam wszystkie główne akcje. Dolna krawędź to strefa
 * naturalnego zasięgu. Odstęp dolny uwzględnia wskaźnik gestu na iPhonie — bez
 * tego przyciski wchodziłyby pod niego w trybie PWA.
 */
export function CalendarMobileActions({ isListView, onGrid, onList, onAdd, onMore }: Props) {
  const item = 'flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t bg-white px-2 pt-1 md:hidden"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onGrid}
        aria-pressed={!isListView}
        className={`${item} ${!isListView ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <LayoutGrid size={18} />
        Siatka
      </button>
      <button
        type="button"
        onClick={onList}
        aria-pressed={isListView}
        className={`${item} ${isListView ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
      >
        <List size={18} />
        Lista
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Dodaj wizytę"
        className={`${item} bg-primary text-primary-foreground`}
      >
        <CalendarPlus size={18} />
        Wizyta
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label="Więcej akcji"
        className={`${item} bg-secondary text-secondary-foreground`}
      >
        <MoreHorizontal size={18} />
        Więcej
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Usuń mobilny pasek widoków**

W `CalendarView.tsx` usuń w całości blok zaczynający się od:

```tsx
        <div className="flex items-center gap-1.5 border-b bg-white p-2 md:hidden">
```

wraz z jego zawartością (przyciski `Lista`, `Siatka`, „Więcej akcji") i zamykającym `</div>`. Wszystkie trzy przyciski wracają w dolnym pasku.

- [ ] **Step 3: Wyrenderuj dolny pasek**

Dopisz import:

```ts
import { CalendarMobileActions } from './CalendarMobileActions';
```

i wyrenderuj obok pozostałych elementów na końcu komponentu:

```tsx
      <CalendarMobileActions
        isListView={view === 'listWeek'}
        onGrid={switchToMobileGrid}
        onList={() => { setZoomedEmployeeId(null); switchView('listWeek'); }}
        onAdd={() => setAddModal({})}
        onMore={() => setMobileActionsOpen(true)}
      />
```

- [ ] **Step 4: Dodaj odstęp pod siatką**

Kontener siatki ma dziś `className="cosmo-calendar px-1 pb-1 md:min-h-0 md:flex-1 md:overflow-hidden"`. Zamień odstęp dolny tak, żeby ostatnia godzina nie chowała się pod paskiem:

```tsx
          className="cosmo-calendar px-1 pb-24 md:min-h-0 md:flex-1 md:overflow-hidden md:pb-1"
```

- [ ] **Step 5: Usuń „Dodaj wizytę" z arkusza akcji**

W arkuszu `MobileSheet` otwieranym przyciskiem „Więcej" usuń pozycję:

```tsx
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setAddModal({}); setMobileActionsOpen(false); }}
        >
          <Calendar size={16} className="text-green-600" /> Dodaj wizytę
        </button>
```

Jest teraz osobnym przyciskiem `Wizyta` w dolnym pasku. **Pozostałe pięć pozycji arkusza zostaje bez zmian.**

- [ ] **Step 6: Wymuś widok dnia na telefonie**

Dopisz efekt obok pozostałych `useEffect` w komponencie:

```ts
  // Kolumny pracownic na szerokości telefonu są nieczytelne, a przy jednej osobie
  // nagłówek kolumny zajmuje 85 px, żeby powtórzyć niezmienną informację. Na
  // telefonie trzymamy się widoku jednego dnia jednej pracownicy niezależnie od
  // tego, w jakim stanie zastaliśmy widok.
  useEffect(() => {
    if (!isMobile || view !== 'resourceTimeGridDay') return;
    switchToMobileGrid();
  }, [isMobile, view]);
```

- [ ] **Step 7: Zweryfikuj**

Run: `pnpm exec tsc --noEmit`
Expected: brak błędów. Jeśli po usunięciu paska widoków któryś import (np. `MoreHorizontal`) stał się nieużywany w `CalendarView.tsx`, usuń go — nieużywany import wywraca `tsc`.

Run: `pnpm vitest run src/components/calendar/`
Expected: PASS.

Run: `pnpm build`
Expected: build przechodzi, audyt SEO zdany.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/calendar/CalendarMobileActions.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): pasek akcji przy dolnej krawedzi na telefonie"
```

---

### Task 5: Weryfikacja na telefonie i deploy

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże problem.

**Interfaces:**
- Consumes: wszystko z Tasków 1–4.
- Produces: działający układ na produkcji.

- [ ] **Step 1: Ustal stan wyjściowy**

Z katalogu `cosmo-app`: `pnpm dev`, otwórz na telefonie albo w DevTools przy szerokości 390 px, **wyrejestruj service workera** (DevTools → Application → Service Workers → Unregister) i przeładuj. Zanotuj, w jakim widoku startuje kalendarz i czy pojawia się nagłówek z awatarem pracownicy.

To rozstrzyga sprzeczność opisaną w specu: awatar rysuje `resourceLabelContent`, który działa wyłącznie w widoku z kolumnami, a kod mobilny celuje w `timeGridDay`. Jeśli awatar nadal się pojawia mimo efektu z Taska 4 kroku 6, zgłoś to jako problem zamiast obchodzić.

- [ ] **Step 2: Górna belka**

Mieści się w jednym rzędzie na 390 px, bez zawijania. Strzałki przesuwają o tydzień. Tapnięcie daty otwiera arkusz z tygodniami; wybór tygodnia przenosi kalendarz i zamyka arkusz.

- [ ] **Step 3: Przycisk „Dziś"**

Przejdź na inny dzień — przycisk się pojawia. Wróć na dzisiaj — znika.

- [ ] **Step 4: Rząd dni**

Przenosi między dniami, aktywny dzień podświetlony, dzisiejszy podkreślony, sobota i niedziela w cieplejszym odcieniu.

- [ ] **Step 5: Legenda**

`ⓘ` rozwija i zwija legendę. Przeładuj stronę — na telefonie zostaje zwinięta, mimo że na komputerze jest rozwinięta. Sprawdź też odwrotnie: rozwinięcie na telefonie nie zwija jej na komputerze.

- [ ] **Step 6: Dolny pasek**

`Siatka` i `Lista` przełączają widok. `Wizyta` otwiera dodanie wizyty. `Więcej` otwiera arkusz z pięcioma pozycjami: klientka z zewnątrz, Happy Hour, przełącznik Happy Hours, przełącznik kalendarza Apple, ustawienia kalendarza Apple.

- [ ] **Step 7: Pasek nie zasłania siatki**

Przewiń do ostatniej godziny — musi być w pełni widoczna nad paskiem.

- [ ] **Step 8: Bezpieczny obszar w PWA**

Na iPhonie z aplikacją dodaną do ekranu głównego pasek nie wchodzi pod wskaźnik gestu.

- [ ] **Step 9: Reszta funkcji**

Menu godziny po tapnięciu w slot z czterema pozycjami, popover blokady, panel klientki po tapnięciu w wizytę, badge ❗ na wydarzeniu Apple.

- [ ] **Step 10: Komputer bez zmian**

Otwórz na szerokości desktopowej i porównaj z dotychczasowym układem: pasek okresu, toolbar z grupami, legenda i siatka wypełniająca obszar treści mają wyglądać jak przed zmianą.

- [ ] **Step 11: Deploy**

Zmiana dotyczy wyłącznie frontendu:

```bash
./deploy.sh frontend
```

- [ ] **Step 12: Sprawdź na produkcji**

Otwórz na telefonie, zamknij PWA z listy zadań i otwórz ponownie (service worker inaczej poda starą wersję), powtórz kroki 2, 5, 6 i 7.
