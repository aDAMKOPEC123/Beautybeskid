# Godziny pracy z poziomu kalendarza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin klika godzinę w kalendarzu wizyt i dodaje albo usuwa godziny pracy — dla wybranych pracownic lub całego salonu — a zielone tło godzin pracy dostaje etykietę „Dostępne godziny" z zakresem.

**Architecture:** Scalanie i odejmowanie przedziałów żyje po stronie serwera jako czyste funkcje (`work-hours.rules.ts`) objęte testami. Dwa nowe endpointy admina czytają aktualne godziny dnia wyłącznie z wyjątku `EmployeeWorkDay` (brak wyjątku = brak godzin, grafik tygodniowy nie jest odczytywany), przeliczają listę przedziałów i zapisują wyjątek na tę datę. Frontend tylko woła endpoint raz na pracownicę — żadnej logiki przedziałów w przeglądarce.

**Tech Stack:** Node/Express 5 + Prisma + PostgreSQL po stronie serwera; React 19 + FullCalendar v6 + TanStack Query + Tailwind po stronie web. Testy: vitest.

Spec: `docs/superpowers/specs/2026-08-27-godziny-pracy-z-kalendarza-design.md`

## Global Constraints

- Wszystkie polecenia uruchamiaj z katalogu `cosmo-app/`, chyba że krok mówi inaczej.
- Zmiana dotyka WYŁĄCZNIE wyjątków na konkretny dzień (`EmployeeWorkDay`). Stały grafik tygodniowy (`EmployeeWeeklySchedule`) nie może być nigdzie zapisywany ani odczytywany jako punkt wyjścia do scalania — o dostępności terminów dla klientek decyduje wyłącznie `EmployeeWorkDay`; brak wyjątku na dany dzień oznacza brak dostępnych godzin, niezależnie od grafiku tygodniowego.
- Godziny pracy nigdy nie kasują, nie odwołują ani nie przekładają istniejących wizyt. Kolizja z wizytą to wyłącznie ostrzeżenie w interfejsie.
- Blokady godzin mają pierwszeństwo nad godzinami pracy i ta zależność już działa w `getAvailabilityForDuration` — nie zmieniaj tam niczego.
- Zielone godziny pracy pozostają zdarzeniami tłowymi (`display: 'background'`). Nie zmieniaj ich na zwykłe zdarzenia — w tym repo próba takiej zmiany przy warstwie Apple odebrała klikalność godzin w całym kalendarzu i została wycofana.
- Teksty w UI po polsku, z polskimi znakami. Komunikaty błędów backendu też (`AppError('...', 400)`).
- Testy vitest w tym repo są czysto jednostkowe, bez bazy. Logika obliczeniowa musi być czystą funkcją przyjmującą dane w argumentach (wzór: `calendar-blocks.rules.ts`).
- Backend: serwisy rzucają `AppError` z `middleware/error.middleware`, kontrolery mają kształt `try { ... } catch (err) { next(err) }`.
- Nie pushuj do zdalnego repo. Commituj po każdym zadaniu.

## File Structure

**Tworzone**
- `apps/server/src/modules/employees/work-hours.rules.ts` — czyste `mergeTimeBlocks` i `subtractTimeBlock`
- `apps/server/src/modules/employees/work-hours.rules.test.ts`
- `apps/web/src/components/calendar/WorkHoursModal.tsx` — okno dodawania i usuwania godzin

**Modyfikowane**
- `apps/server/src/modules/employees/employees.service.ts` — `addWorkHours` i `removeWorkHours`
- `apps/server/src/modules/employees/employees.controller.ts` — dwa handlery
- `apps/server/src/modules/employees/employees.router.ts` — dwie trasy admina
- `apps/web/src/api/employees.api.ts` — dwie metody klienta
- `apps/web/src/components/calendar/CalendarView.tsx` — dwie pozycje w menu slotu, etykieta na zielonym tle, zakres w `extendedProps`

---

### Task 1: Czyste reguły scalania i odejmowania przedziałów

**Files:**
- Create: `apps/server/src/modules/employees/work-hours.rules.ts`
- Test: `apps/server/src/modules/employees/work-hours.rules.test.ts`

**Interfaces:**
- Produces:
  - `mergeTimeBlocks(blocks: TimeBlock[], added: TimeBlock): TimeBlock[]`
  - `subtractTimeBlock(blocks: TimeBlock[], removed: TimeBlock): TimeBlock[]`
  - `TimeBlock` jest importowany z `./employees.service` (już tam istnieje: `{ start: string; end: string }`)

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `apps/server/src/modules/employees/work-hours.rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeTimeBlocks, subtractTimeBlock } from './work-hours.rules';

describe('mergeTimeBlocks', () => {
  it('dodaje rozłączny zakres i sortuje wynik', () => {
    expect(mergeTimeBlocks([{ start: '14:00', end: '16:00' }], { start: '09:00', end: '11:00' }))
      .toEqual([{ start: '09:00', end: '11:00' }, { start: '14:00', end: '16:00' }]);
  });

  it('scala zakres nachodzący w jeden', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '13:00' }], { start: '12:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('scala zakres stykający się krańcem w jeden', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '13:00' }], { start: '13:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('dodanie do pustej listy daje jeden blok', () => {
    expect(mergeTimeBlocks([], { start: '10:00', end: '12:00' }))
      .toEqual([{ start: '10:00', end: '12:00' }]);
  });

  it('zakres zawarty w istniejącym niczego nie zmienia', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '17:00' }], { start: '11:00', end: '12:00' }))
      .toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('scala trzy zachodzące na siebie bloki w jeden', () => {
    const blocks = [{ start: '09:00', end: '11:00' }, { start: '10:30', end: '13:00' }];
    expect(mergeTimeBlocks(blocks, { start: '12:30', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });
});

describe('subtractTimeBlock', () => {
  it('odjęcie środka dzieli blok na dwa', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '12:00', end: '13:00' }))
      .toEqual([{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }]);
  });

  it('odjęcie początku skraca blok', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '09:00', end: '11:00' }))
      .toEqual([{ start: '11:00', end: '17:00' }]);
  });

  it('odjęcie końca skraca blok', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '15:00', end: '17:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('odjęcie całego bloku zostawia pustą listę', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '08:00', end: '18:00' }))
      .toEqual([]);
  });

  it('odjęcie zakresu spoza godzin pracy niczego nie zmienia', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '13:00' }], { start: '15:00', end: '16:00' }))
      .toEqual([{ start: '09:00', end: '13:00' }]);
  });

  it('zakres stykający się krańcem nie obcina bloku', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '13:00' }], { start: '13:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '13:00' }]);
  });

  it('odejmuje z wielu bloków naraz', () => {
    const blocks = [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }];
    expect(subtractTimeBlock(blocks, { start: '11:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '11:00' }, { start: '15:00', end: '18:00' }]);
  });
});
```

- [ ] **Step 2: Uruchom test i potwierdź, że nie przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/employees/work-hours.rules.test.ts
```

Oczekiwane: FAIL — `Failed to resolve import "./work-hours.rules"`.

- [ ] **Step 3: Napisz implementację**

Utwórz `apps/server/src/modules/employees/work-hours.rules.ts`:

```ts
import type { TimeBlock } from './employees.service';

// Czyste operacje na przedziałach godzin pracy — bez Prismy, bez sieci.
// Przedziały stykające się krańcami traktujemy jako ciągłe: 09:00-13:00 + 13:00-15:00 = 09:00-15:00.

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number): string => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

export function mergeTimeBlocks(blocks: TimeBlock[], added: TimeBlock): TimeBlock[] {
  const ranges = [...blocks, added]
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  return merged.map((r) => ({ start: toTime(r.start), end: toTime(r.end) }));
}

export function subtractTimeBlock(blocks: TimeBlock[], removed: TimeBlock): TimeBlock[] {
  const cut = { start: toMinutes(removed.start), end: toMinutes(removed.end) };
  const out: TimeBlock[] = [];

  for (const block of blocks) {
    const start = toMinutes(block.start);
    const end = toMinutes(block.end);

    // Brak nachodzenia — blok zostaje bez zmian.
    if (cut.end <= start || cut.start >= end) {
      out.push(block);
      continue;
    }
    // Fragment przed wycinanym zakresem.
    if (cut.start > start) out.push({ start: toTime(start), end: toTime(Math.min(cut.start, end)) });
    // Fragment po wycinanym zakresie.
    if (cut.end < end) out.push({ start: toTime(Math.max(cut.end, start)), end: toTime(end) });
  }

  return out;
}
```

- [ ] **Step 4: Uruchom test i potwierdź, że przechodzi**

```bash
cd apps/server && pnpm vitest run src/modules/employees/work-hours.rules.test.ts
```

Oczekiwane: PASS, 13 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/employees/work-hours.rules.ts apps/server/src/modules/employees/work-hours.rules.test.ts
git commit -m "feat(grafik): czyste reguły scalania i odejmowania godzin pracy + testy"
```

---

### Task 2: Endpointy dodawania i usuwania godzin pracy

**Files:**
- Modify: `apps/server/src/modules/employees/employees.service.ts`
- Modify: `apps/server/src/modules/employees/employees.controller.ts`
- Modify: `apps/server/src/modules/employees/employees.router.ts`

**Interfaces:**
- Consumes: `mergeTimeBlocks`, `subtractTimeBlock` z Task 1.
- Produces:
  - `addWorkHours(employeeId: string, data: { date: string; start: string; end: string })`
  - `removeWorkHours(employeeId: string, data: { date: string; start: string; end: string })`
  - `POST /api/employees/:id/schedule/add-hours`, `POST /api/employees/:id/schedule/remove-hours` (oba admin-only), ciało `{ date, start, end }`

- [ ] **Step 1: Dodaj obie funkcje do serwisu**

W `apps/server/src/modules/employees/employees.service.ts`, tuż pod istniejącym `upsertWorkDay`, dopisz. Importy `mergeTimeBlocks`/`subtractTimeBlock` dodaj na górze pliku:

```ts
import { mergeTimeBlocks, subtractTimeBlock } from './work-hours.rules';
```

```ts
// Zwraca godziny obowiązujące danego dnia na podstawie WYŁĄCZNIE wyjątku EmployeeWorkDay —
// to jedyne źródło, z którego getAvailabilityForDuration() liczy dostępność dla klientek;
// grafik tygodniowy do niej nie wchodzi, więc scalanie musi trzymać się tego samego źródła.
// Brak wyjątku albo dzień oznaczony jako wolny = brak godzin, punktem wyjścia jest lista pusta.
// Uwaga: dzień pracujący bez zapisanych przedziałów oznacza domyślne godziny (patrz resolveEmployeeBlocks),
// więc musimy je tu odtworzyć — inaczej pierwsze dodanie godzin skasowałoby cały dzień pracy.
const resolveCurrentBlocks = async (employeeId: string, normalized: Date): Promise<TimeBlock[]> => {
  const workDay = await prisma.employeeWorkDay.findUnique({
    where: { employeeId_date: { employeeId, date: normalized } },
  });

  if (!workDay) return [];
  if (!workDay.isWorking) return [];
  const blocks = (workDay.timeBlocks as TimeBlock[] | null) ?? [];
  return blocks.length > 0 ? blocks : DEFAULT_TIME_BLOCKS;
};

const validateRange = (start: string, end: string): void => {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    throw new AppError('Nieprawidłowy format godziny', 400);
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    throw new AppError('Godzina zakończenia musi być późniejsza niż rozpoczęcia', 400);
  }
};

export const addWorkHours = async (
  employeeId: string,
  data: { date: string; start: string; end: string }
) => {
  validateRange(data.start, data.end);
  const normalized = normalizeDate(data.date);
  const current = await resolveCurrentBlocks(employeeId, normalized);
  const timeBlocks = mergeTimeBlocks(current, { start: data.start, end: data.end });

  return await prisma.employeeWorkDay.upsert({
    where: { employeeId_date: { employeeId, date: normalized } },
    create: { employeeId, date: normalized, isWorking: true, timeBlocks: timeBlocks as any, note: null },
    update: { isWorking: true, timeBlocks: timeBlocks as any },
  });
};

export const removeWorkHours = async (
  employeeId: string,
  data: { date: string; start: string; end: string }
) => {
  validateRange(data.start, data.end);
  const normalized = normalizeDate(data.date);
  const current = await resolveCurrentBlocks(employeeId, normalized);
  const timeBlocks = subtractTimeBlock(current, { start: data.start, end: data.end });

  // Pusta lista przy isWorking=true oznaczałaby domyślne 09:00-18:00 (resolveEmployeeBlocks),
  // czyli godziny wróciłyby same. Dlatego dzień bez godzin zapisujemy jako wolny.
  const isWorking = timeBlocks.length > 0;

  return await prisma.employeeWorkDay.upsert({
    where: { employeeId_date: { employeeId, date: normalized } },
    create: {
      employeeId,
      date: normalized,
      isWorking,
      timeBlocks: (isWorking ? timeBlocks : null) as any,
      note: null,
    },
    update: {
      isWorking,
      timeBlocks: (isWorking ? timeBlocks : null) as any,
    },
  });
};
```

Uwaga: `DEFAULT_TIME_BLOCKS`, `normalizeDate` i `timeToMinutes` już istnieją w tym pliku (okolice linii 15–28) — nie definiuj ich ponownie.

- [ ] **Step 2: Dodaj handlery kontrolera**

W `apps/server/src/modules/employees/employees.controller.ts`, obok istniejących handlerów grafiku, dopisz (nazwy funkcji serwisu importuj tak, jak robią to sąsiednie handlery w tym pliku):

```ts
export const addWorkHours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, start, end } = req.body as { date?: string; start?: string; end?: string };
    if (!date || !start || !end) {
      res.status(400).json({ message: 'Wymagane pola: date, start, end' });
      return;
    }
    const workDay = await employeesService.addWorkHours(req.params.id, { date, start, end });
    res.json({ data: { workDay } });
  } catch (err) {
    next(err);
  }
};

export const removeWorkHours = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, start, end } = req.body as { date?: string; start?: string; end?: string };
    if (!date || !start || !end) {
      res.status(400).json({ message: 'Wymagane pola: date, start, end' });
      return;
    }
    const workDay = await employeesService.removeWorkHours(req.params.id, { date, start, end });
    res.json({ data: { workDay } });
  } catch (err) {
    next(err);
  }
};
```

Sprawdź w pliku, czy serwis jest importowany jako `employeesService` czy przez pojedyncze nazwy, i dopasuj się do tego, co jest.

- [ ] **Step 3: Dodaj trasy**

W `apps/server/src/modules/employees/employees.router.ts`, w sekcji admina (obok `router.post('/:id/schedule', ...)`), dopisz:

```ts
router.post('/:id/schedule/add-hours', authenticate, requireAdmin, ctrl.addWorkHours);
router.post('/:id/schedule/remove-hours', authenticate, requireAdmin, ctrl.removeWorkHours);
```

- [ ] **Step 4: Zweryfikuj build i testy**

```bash
cd apps/server && pnpm build && pnpm test
```

Oczekiwane: build OK, wszystkie testy przechodzą.

- [ ] **Step 5: Sprawdź działanie na żywej bazie**

Napisz tymczasowy skrypt uruchamiany przez `npx tsx`, który dla dowolnej istniejącej pracownicy i daty jutrzejszej: (1) drukuje wynik `resolveCurrentBlocks` przez wywołanie `addWorkHours` z zakresem 14:00–16:00 i pokazuje zapisane `timeBlocks`, (2) wywołuje `removeWorkHours` dla 12:00–13:00 i pokazuje wynik, (3) sprząta po sobie w bloku `finally`, kasując utworzony `EmployeeWorkDay` (albo przywracając go do stanu sprzed testu, jeśli istniał wcześniej). Umieść dosłowne wyjście skryptu w raporcie. Plik skasuj po użyciu, nie commituj go.

Oczekiwane: dodanie 14:00–16:00 do dnia z godzinami 09:00–18:00 nie zmienia nic (zakres zawarty), a odjęcie 12:00–13:00 daje dwa bloki: 09:00–12:00 i 13:00–18:00.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/employees/
git commit -m "feat(grafik): endpointy dodawania i usuwania godzin pracy"
```

---

### Task 3: Okno godzin pracy w kalendarzu

**Files:**
- Modify: `apps/web/src/api/employees.api.ts`
- Create: `apps/web/src/components/calendar/WorkHoursModal.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: endpointy z Task 2.
- Produces:
  - `employeesApi.addWorkHours(employeeId, { date, start, end })`, `employeesApi.removeWorkHours(...)`
  - komponent `WorkHoursModal` o props: `{ open: boolean; mode: 'add' | 'remove'; onClose: () => void; prefill: { date: string; time?: string; employeeId?: string }; employees: any[]; appointments: any[] }`

- [ ] **Step 1: Dodaj metody klienta API**

W `apps/web/src/api/employees.api.ts`, w sekcji „Schedule (admin — for any employee)", obok `upsertWorkDay`, dopisz:

```ts
  addWorkHours: async (employeeId: string, data: { date: string; start: string; end: string }) => {
    const res = await api.post(`/employees/${employeeId}/schedule/add-hours`, data);
    return res.data.data.workDay as WorkDay;
  },
  removeWorkHours: async (employeeId: string, data: { date: string; start: string; end: string }) => {
    const res = await api.post(`/employees/${employeeId}/schedule/remove-hours`, data);
    return res.data.data.workDay as WorkDay;
  },
```

- [ ] **Step 2: Napisz komponent okna**

Utwórz `apps/web/src/components/calendar/WorkHoursModal.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees.api';
import { Clock, X } from 'lucide-react';

interface Props {
  open: boolean;
  mode: 'add' | 'remove';
  onClose: () => void;
  prefill: { date: string; time?: string; employeeId?: string };
  employees: any[];
  appointments: any[];
}

// "13:30" + 60 → "14:30"; nie przekracza doby (23:59 to maksimum).
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return '23:59';
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function WorkHoursModal({ open, mode, onClose, prefill, employees, appointments }: Props) {
  const qc = useQueryClient();
  const startTimeDefault = prefill.time ?? '09:00';

  const [date, setDate] = useState(prefill.date);
  const [from, setFrom] = useState(startTimeDefault);
  const [to, setTo] = useState(addMinutesToTime(startTimeDefault, 60));
  const [appliesToAll, setAppliesToAll] = useState(!prefill.employeeId);
  const [employeeIds, setEmployeeIds] = useState<string[]>(
    prefill.employeeId ? [prefill.employeeId] : [],
  );
  const [error, setError] = useState<string | null>(null);

  const targetIds = appliesToAll ? employees.map((e: any) => e.id) : employeeIds;

  // Przy usuwaniu godzin ostrzegamy o wizytach w tym czasie — nie są ruszane.
  const collidingCount = useMemo(() => {
    if (mode !== 'remove') return 0;
    const s = new Date(`${date}T${from}:00`).getTime();
    const e = new Date(`${date}T${to}:00`).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return appointments.filter((appt: any) => {
      if (appt.status === 'CANCELLED') return false;
      if (appt.employeeId && !targetIds.includes(appt.employeeId)) return false;
      const aptStart = new Date(appt.date).getTime();
      const aptEnd = aptStart + (appt.service?.durationMinutes ?? 60) * 60_000;
      return aptStart < e && aptEnd > s;
    }).length;
  }, [mode, appointments, date, from, to, targetIds]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload = { date, start: from, end: to };
      const failed: string[] = [];
      // Zapisujemy po kolei, pracownica po pracownicy — każda ma własne godziny do scalenia.
      for (const id of targetIds) {
        try {
          if (mode === 'add') await employeesApi.addWorkHours(id, payload);
          else await employeesApi.removeWorkHours(id, payload);
        } catch {
          const emp = employees.find((e: any) => e.id === id);
          failed.push(emp?.name ?? id);
        }
      }
      return failed;
    },
    onSuccess: (failed) => {
      qc.invalidateQueries({ queryKey: ['employee-schedule'] });
      qc.invalidateQueries({ queryKey: ['employee-weekly-schedule'] });
      if (failed.length > 0) {
        setError(`Nie udało się zapisać dla: ${failed.join(', ')}. Pozostałe zmiany zapisano.`);
        return;
      }
      onClose();
    },
    onError: () => setError('Nie udało się zapisać godzin pracy'),
  });

  if (!open) return null;

  const submit = () => {
    setError(null);
    if (to <= from) {
      setError('Godzina zakończenia musi być późniejsza niż rozpoczęcia');
      return;
    }
    if (targetIds.length === 0) {
      setError('Wybierz co najmniej jedną pracownicę');
      return;
    }
    mutate();
  };

  const toggleEmployee = (id: string) =>
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const title = mode === 'add' ? 'Dodaj godziny pracy' : 'Usuń godziny pracy';
  const confirmLabel = mode === 'add' ? 'Dodaj' : 'Usuń';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Clock size={18} className="text-green-600" />
          <h2 className="text-lg font-semibold">{title}</h2>
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

        <fieldset className="mb-3">
          <legend className="mb-1 text-sm font-medium">Kogo dotyczy</legend>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={appliesToAll} onChange={() => setAppliesToAll(true)} />
            Cały salon
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" checked={!appliesToAll} onChange={() => setAppliesToAll(false)} />
            Wybrane pracownice
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
            Usunięcie godzin wstrzymuje tylko nowe zapisy.
          </p>
        )}

        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm" onClick={onClose}>Anuluj</button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              mode === 'add' ? 'bg-green-600' : 'bg-red-600'
            }`}
            disabled={isPending}
            onClick={submit}
          >
            {isPending ? 'Zapisywanie…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Podłącz okno i pozycje menu w `CalendarView.tsx`**

Dopisz import:

```ts
import { WorkHoursModal } from './WorkHoursModal';
import { Clock } from 'lucide-react';
```

Dopisz stan obok `blockModal`:

```ts
  const [workHoursModal, setWorkHoursModal] = useState<{ mode: 'add' | 'remove'; date: string; time?: string; employeeId?: string } | null>(null);
```

Nad `return (` dopisz funkcję sprawdzającą, czy kliknięta godzina mieści się w godzinach pracy — pozycja „Usuń godziny pracy" ma się pokazywać tylko wtedy:

```ts
  // Czy kliknięty slot leży w godzinach pracy? Sprawdzamy na tych samych danych,
  // z których rysujemy zielone tło, żeby menu nie kłamało.
  const slotHasWorkingHours = (date: string, time?: string, employeeId?: string): boolean => {
    if (!time) return false;
    const clicked = new Date(`${date}T${time}:00`).getTime();
    return workingHourEvents.some((ev) => {
      if (employeeId && ev.resourceId !== employeeId) return false;
      const start = new Date(ev.start as string).getTime();
      const end = new Date(ev.end as string).getTime();
      return clicked >= start && clicked < end;
    });
  };
```

W menu slotu, pod pozycją „Zablokuj godziny", dopisz dwie pozycje:

```tsx
            <button
              className="flex items-center gap-2.5 w-full text-sm px-2 py-2 rounded-lg hover:bg-accent text-left"
              onClick={() => {
                setWorkHoursModal({ mode: 'add', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
                setSlotMenu(null);
              }}
            >
              <Clock size={15} className="text-green-600" />
              Dodaj godziny pracy
            </button>
            {slotHasWorkingHours(slotMenu.date, slotMenu.time, slotMenu.employeeId) && (
              <button
                className="flex items-center gap-2.5 w-full text-sm px-2 py-2 rounded-lg hover:bg-accent text-left"
                onClick={() => {
                  setWorkHoursModal({ mode: 'remove', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId });
                  setSlotMenu(null);
                }}
              >
                <Clock size={15} className="text-red-500" />
                Usuń godziny pracy
              </button>
            )}
```

Na końcu komponentu, obok `BlockHoursModal`, dopisz:

```tsx
      {workHoursModal && (
        <WorkHoursModal
          open
          mode={workHoursModal.mode}
          onClose={() => setWorkHoursModal(null)}
          prefill={{ date: workHoursModal.date, time: workHoursModal.time, employeeId: workHoursModal.employeeId }}
          employees={employees}
          appointments={appointments}
        />
      )}
```

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/employees.api.ts apps/web/src/components/calendar/WorkHoursModal.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(grafik): dodawanie i usuwanie godzin pracy z menu kalendarza"
```

---

### Task 4: Etykieta „Dostępne godziny" na zielonym tle

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `buildWorkingHourEvents` (istnieje w tym pliku, ok. linii 29–70).
- Produces: `extendedProps.rangeLabel` na zdarzeniach godzin pracy.

- [ ] **Step 1: Dołóż zakres godzin do zdarzenia**

W `buildWorkingHourEvents`, w miejscu tworzenia zdarzenia (`events.push({ ... })`), zamień linię `extendedProps`:

```ts
          extendedProps: { isWorkingHours: true, rangeLabel: `${block.start}–${block.end}` },
```

- [ ] **Step 2: Wyrenderuj etykietę zamiast pustej treści**

W `eventContent` zamień istniejącą linię `if (arg.event.extendedProps.isWorkingHours) return null;` na:

```tsx
                    if (arg.event.extendedProps.isWorkingHours) {
                      return (
                        <div className="px-1 pt-0.5 text-[10px] font-medium leading-tight text-green-700/70 truncate">
                          Dostępne godziny {arg.event.extendedProps.rangeLabel}
                        </div>
                      );
                    }
```

Zdarzenia godzin pracy pozostają tłowe (`display: 'background'`) — nie zmieniaj tego. Treść z `eventContent` renderuje się także dla tła, co potwierdziliśmy w tym repo przy warstwie kalendarza Apple.

- [ ] **Step 3: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(grafik): etykieta dostępnych godzin na zielonym tle kalendarza"
```

---

### Task 5: Weryfikacja całości

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże błąd.

- [ ] **Step 1: Pełny build i testy**

```bash
pnpm build
cd apps/server && pnpm test
cd ../web && pnpm lint
```

Oczekiwane: build wszystkich paczek OK, wszystkie testy backendu przechodzą, lint czysty.

- [ ] **Step 2: Sprawdzenie w przeglądarce**

Uruchom `pnpm dev` z `cosmo-app/`, zaloguj się jako admin, wejdź w `/admin/wizyty` → widok kalendarza i sprawdź po kolei:

1. Zielone pasy mają napis „Dostępne godziny" z zakresem i nie zasłaniają wizyt.
2. Klik w godzinę **poza** godzinami pracy → menu ma „Dodaj godziny pracy", nie ma „Usuń godziny pracy".
3. Klik w godzinę **wewnątrz** zielonego pasa → menu ma obie pozycje.
4. „Dodaj godziny pracy" z kliknięcia w kolumnę pracownicy → okno otwiera się na „Wybrane pracownice" z zaznaczoną tą osobą.
5. Dodaj 19:00–20:00 pracownicy, która pracuje do 18:00 → zielony pas wydłuża się do 20:00, a jej wcześniejsze godziny pozostają.
6. Usuń 12:00–13:00 z jej dnia → zielony pas dzieli się na dwa, z przerwą.
7. Wariant „Cały salon" → zmiana pojawia się w kolumnach wszystkich pracownic.
8. Otwórz `/rezerwacja` w trybie prywatnym → godziny dodane w punkcie 5 są dostępne do rezerwacji, a te usunięte w punkcie 6 zniknęły.
9. Załóż blokadę na godzinę mieszczącą się w godzinach pracy → w `/rezerwacja` termin ma pozostać niedostępny (blokada ma pierwszeństwo).

Zapisz w raporcie, które punkty przeszły, a które nie. Jeśli któryś nie przeszedł — zgłoś to jako problem, nie próbuj obchodzić.

- [ ] **Step 3: Wdrożenie**

Wdrożenie na produkcję wykonuje właściciel projektu — NIE uruchamiaj `deploy.sh`. Zadanie kończy się na zweryfikowanej, zacommitowanej gałęzi.

---

## Notatki dla wykonawcy

- Zmiany dotykają wyłącznie wyjątków na konkretny dzień. Jeśli w trakcie pracy zobaczysz jakikolwiek zapis ALBO odczyt `EmployeeWeeklySchedule` w ścieżce dodawania/usuwania godzin, to błąd — grafik tygodniowy nie jest punktem wyjścia do scalania, bo `getAvailabilityForDuration()` go nie czyta; podstawą jest wyłącznie `EmployeeWorkDay`.
- `resolveEmployeeBlocks` w `employees.service.ts:332` podstawia domyślne 09:00–18:00 dla dnia pracującego bez zapisanych przedziałów. To jedyny powód, dla którego `removeWorkHours` zapisuje dzień bez godzin jako wolny — nie „upraszczaj" tego z powrotem.
- Klucze unieważniane po zapisie (`['employee-schedule']`, `['employee-weekly-schedule']`) muszą pasować do kluczy, którymi `CalendarView.tsx` pobiera grafiki — sprawdź je w pliku przed zmianą.
