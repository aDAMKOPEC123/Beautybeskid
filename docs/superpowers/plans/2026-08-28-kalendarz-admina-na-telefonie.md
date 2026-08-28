# Kalendarz admina na telefonie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kalendarz wizyt w panelu admina staje się używalny na telefonie: otwiera się na liście, siatka pokazuje jedną pracownicę na pełną szerokość, menu godziny wysuwa się od dołu, a panele i okna mieszczą się na ekranie.

**Architecture:** Jeden hook `useIsMobile` (próg 767 px, reaktywny) steruje czterema rzeczami w `CalendarView`: widokiem domyślnym, składem paska narzędzi, formą menu i marginesami paneli. Żadnego równoległego komponentu kalendarza — logika wizyt, blokad i godzin pracy pozostaje jedna. Nowy generyczny `MobileSheet` obsługuje wszystkie arkusze wysuwane od dołu.

**Tech Stack:** React 19, FullCalendar v6 (`resourceTimeGrid`, `timeGrid`, `list`), TanStack Query, Tailwind. Bez zmian w backendzie.

Spec: `docs/superpowers/specs/2026-08-28-kalendarz-admina-na-telefonie-design.md`

## Global Constraints

- Zmiana dotyka WYŁĄCZNIE warstwy prezentacji. Żadnych zmian w `apps/server`, w logice dostępności terminów, blokad godzin ani godzin pracy.
- Zachowanie na komputerze (szerokość ≥ 768 px) musi zostać dokładnie takie, jakie jest. Każda zmiana układu jest albo pod prefiksem `md:`, albo warunkowana hookiem `useIsMobile`.
- Próg telefonu to `(max-width: 767px)` — ten sam, którego używa `Navbar.tsx:85` i globalne reguły w `index.css:218`. Nie wprowadzaj trzeciego progu.
- Cele dotykowe w kalendarzu i jego oknach: minimum 44 px wysokości (Tailwind `min-h-11`).
- Zdarzenia tłowe kalendarza (godziny pracy, wydarzenia Apple) pozostają tłowe. W tym repo zamiana warstwy tłowej na zwykłe zdarzenia odebrała klikalność godzin i była wycofywana — nie powtarzaj tego.
- Teksty UI po polsku, z polskimi znakami.
- Zmiany są czysto układowe, więc NIE piszemy testów jednostkowych na klasy CSS. Weryfikacją każdego zadania jest `pnpm build` i `pnpm lint` w `apps/web`, a całości — przejście po interfejsie na wąskim ekranie (Task 7).
- Nie pushuj. Commituj po każdym zadaniu.

## File Structure

**Tworzone**
- `apps/web/src/hooks/useIsMobile.ts` — reaktywne wykrywanie małego ekranu, jedyne źródło prawdy dla kalendarza
- `apps/web/src/components/calendar/MobileSheet.tsx` — generyczny arkusz wysuwany od dołu; używany przez menu godziny, popover blokady i arkusz akcji paska

**Modyfikowane**
- `apps/web/src/components/calendar/CalendarView.tsx` — widok domyślny, siatka jednej pracownicy, skrócony pasek, arkusze, marginesy paneli
- `apps/web/src/components/calendar/ClientDrawer.tsx` — przycisk zamykania o rozmiarze dotykowym
- `apps/web/src/components/calendar/HappyHourPanel.tsx` — pełna szerokość na telefonie, przycisk zamykania
- `apps/web/src/pages/admin/Appointments.tsx` — widoczny przycisk edycji godziny na dotyku, zawijanie prawej kolumny
- `apps/web/src/index.css` — przewijanie arkuszy dolnych

**Odstępstwo od spec (2):** spec zapowiadał naprawę nakładania warstw w `ClientDrawer` (panel `z-40` przykrywa własne tło `z-30`), żeby dało się go zamknąć tapnięciem obok. Przy bliższym spojrzeniu to nie jest do naprawienia zmianą warstw: na telefonie panel ma `w-full`, więc tła po prostu nie ma czego dotknąć. Zamiast tego dokładamy widoczny przycisk „Zamknij" o wysokości 44 px (Task 5).

**Odstępstwo od spec:** spec wymieniał `MobileSlotSheet.tsx` dedykowany menu godziny. Zamiast tego powstaje generyczny `MobileSheet.tsx`, bo tej samej formy potrzebują trzy miejsca (menu godziny, popover blokady, arkusz akcji paska). Jeden komponent zamiast trzech kopii.

---

### Task 1: Hook wykrywania telefonu i widok domyślny

**Files:**
- Create: `apps/web/src/hooks/useIsMobile.ts`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Produces: `useIsMobile(): boolean` — `true` gdy szerokość okna ≤ 767 px; reaguje na zmianę rozmiaru i obrót telefonu. Używany przez zadania 2–5.

- [ ] **Step 1: Utwórz hook**

Utwórz `apps/web/src/hooks/useIsMobile.ts`:

```ts
import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

// Ten sam próg, którego używa Navbar i globalne reguły w index.css.
// Reaktywny — obrót telefonu przełącza układ bez przeładowania strony.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

- [ ] **Step 2: Użyj hooka w CalendarView i ustaw widok domyślny**

W `apps/web/src/components/calendar/CalendarView.tsx` dopisz import:

```ts
import { useIsMobile } from '@/hooks/useIsMobile';
```

Na początku komponentu `CalendarView`, przed pozostałymi stanami, dopisz:

```ts
  const isMobile = useIsMobile();
```

Znajdź deklarację stanu widoku (obecnie `const [view, setView] = useState<CalView>('resourceTimeGridDay');`) i zamień ją na:

```ts
  // Na telefonie kolumny pracownic są nietrafialne palcem — startujemy od listy.
  const [view, setView] = useState<CalView>(isMobile ? 'listWeek' : 'resourceTimeGridDay');
```

- [ ] **Step 3: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useIsMobile.ts apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): hook wykrywania telefonu i lista jako widok domyślny"
```

---

### Task 2: Siatka jednej pracownicy na telefonie

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `useIsMobile()` z Task 1; istniejące `zoomedEmployeeId`, `setZoomedEmployeeId`, `switchView`, `zoomToEmployee`, `workingHourEvents`, `buildWorkingHourEvents`.
- Produces: na telefonie widok siatki to zawsze `timeGridDay` zawężony do jednej pracownicy; wybór trzyma `zoomedEmployeeId`.

- [ ] **Step 1: Zawęź zielone tło do zoomowanej pracownicy**

`buildWorkingHourEvents` rysuje godziny pracy wszystkich pracownic. W widoku bez kolumn (`timeGridDay`, `timeGridWeek`) `resourceId` jest ignorowany, więc pasy wszystkich osób nakładają się na siebie. Dodaj filtr — to naprawia też widok zoomu na komputerze.

W sygnaturze `buildWorkingHourEvents` dopisz parametr na końcu:

```ts
  zoomedEmployeeId: string | null,
```

Wewnątrz pętli po pracownicach, zaraz po `for (const emp of employees) {`, dopisz:

```ts
      // W widoku pojedynczej pracownicy pasy pozostałych osób nałożyłyby się na siebie.
      if (zoomedEmployeeId && emp.id !== zoomedEmployeeId) continue;
```

W wywołaniu w `useMemo` dopisz argument i zależność:

```ts
  const workingHourEvents = useMemo(
    () => buildWorkingHourEvents(employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd, zoomedEmployeeId),
    [employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd, zoomedEmployeeId],
  );
```

- [ ] **Step 2: Przełączanie na siatkę wybiera pracownicę**

Znajdź funkcję `switchView` i dopisz pod nią nową funkcję:

```ts
  // Na telefonie siatka zawsze pokazuje jedną pracownicę — kolumny są za wąskie na dotyk.
  const switchToMobileGrid = () => {
    const targetId = zoomedEmployeeId ?? employees[0]?.id ?? null;
    setZoomedEmployeeId(targetId);
    setView('timeGridWeek');
    calRef.current?.getApi().changeView('timeGridDay');
  };
```

- [ ] **Step 3: Dodaj rząd imion do przełączania pracownicy**

W obszarze kalendarza, bezpośrednio nad kontenerem `<div className="flex-1 overflow-auto p-2" ...>`, dopisz:

```tsx
        {isMobile && zoomedEmployeeId && employees.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-b bg-white px-3 py-2">
            {employees.map((emp: any) => (
              <button
                key={emp.id}
                onClick={() => {
                  setZoomedEmployeeId(emp.id);
                  calRef.current?.getApi().changeView('timeGridDay');
                }}
                className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium ${
                  emp.id === zoomedEmployeeId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        )}
```

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): na telefonie siatka pokazuje jedną pracownicę"
```

---

### Task 3: Generyczny arkusz dolny i skrócony pasek narzędzi

**Files:**
- Create: `apps/web/src/components/calendar/MobileSheet.tsx`
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `useIsMobile()` z Task 1, `switchToMobileGrid()` z Task 2.
- Produces: komponent `MobileSheet` o props `{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode }` — używany też przez Task 4.

- [ ] **Step 1: Napisz komponent arkusza**

Utwórz `apps/web/src/components/calendar/MobileSheet.tsx`:

```tsx
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Arkusz wysuwany od dołu — na telefonie zastępuje popovery pozycjonowane
// względem punktu kliknięcia, które uciekały poza dolną krawędź ekranu.
export function MobileSheet({ open, onClose, title, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-1 pt-2">
          {title && <p className="text-sm font-semibold">{title}</p>}
          <button
            className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-accent"
            onClick={onClose}
            aria-label="Zamknij"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-2 pb-3">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Skróć pasek narzędzi na telefonie**

W `CalendarView.tsx` dopisz importy:

```ts
import { MobileSheet } from './MobileSheet';
import { MoreHorizontal } from 'lucide-react';
```

Dopisz stan obok pozostałych:

```ts
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
```

Cały istniejący blok paska narzędzi (`<div className="flex items-center gap-2 p-3 border-b bg-white flex-wrap"> … </div>`) owiń warunkiem tak, żeby na komputerze został bez zmian, a na telefonie renderował się wariant skrócony. Czyli: zostaw dotychczasowy blok, ale dopisz mu klasę ukrywającą go na telefonie — zmień jego `className` na:

```
"hidden md:flex items-center gap-2 p-3 border-b bg-white flex-wrap"
```

i bezpośrednio nad nim dopisz wariant mobilny:

```tsx
        {/* Pasek mobilny — cztery cele dotykowe, reszta akcji w arkuszu */}
        <div className="flex items-center gap-1.5 border-b bg-white p-2 md:hidden">
          <button
            onClick={() => calRef.current?.getApi().prev()}
            className="min-h-11 min-w-11 rounded-lg bg-gray-100 text-base"
            aria-label="Poprzedni"
          >
            ←
          </button>
          <button
            onClick={() => calRef.current?.getApi().today()}
            className="min-h-11 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white"
          >
            Dziś
          </button>
          <button
            onClick={() => calRef.current?.getApi().next()}
            className="min-h-11 min-w-11 rounded-lg bg-gray-100 text-base"
            aria-label="Następny"
          >
            →
          </button>

          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => { setZoomedEmployeeId(null); switchView('listWeek'); }}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${view === 'listWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Lista
            </button>
            <button
              onClick={switchToMobileGrid}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${view !== 'listWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Siatka
            </button>
            <button
              onClick={() => setMobileActionsOpen(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-gray-100"
              aria-label="Więcej akcji"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
```

- [ ] **Step 3: Dodaj arkusz z pozostałymi akcjami**

Na końcu komponentu, obok innych okien, dopisz:

```tsx
      <MobileSheet open={mobileActionsOpen} onClose={() => setMobileActionsOpen(false)} title="Akcje kalendarza">
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setAddModal({}); setMobileActionsOpen(false); }}
        >
          <Calendar size={16} className="text-green-600" /> Dodaj wizytę
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setExternalModal({}); setMobileActionsOpen(false); }}
        >
          <UserPlus size={16} className="text-violet-500" /> Klientka z zewnątrz
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setHhPanelOpen(true); setMobileActionsOpen(false); }}
        >
          <Zap size={16} className="text-amber-500" /> Happy Hours
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setShowHappyHours((v) => !v); setMobileActionsOpen(false); }}
        >
          <Zap size={16} className="text-yellow-500" /> {showHappyHours ? 'Ukryj Happy Hours' : 'Pokaż Happy Hours'}
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setShowApple((v) => !v); setMobileActionsOpen(false); }}
        >
          <Calendar size={16} className="text-gray-500" /> {showApple ? 'Ukryj kalendarz Apple' : 'Pokaż kalendarz Apple'}
        </button>
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-accent"
          onClick={() => { setAppleSettingsOpen(true); setMobileActionsOpen(false); }}
        >
          <Settings size={16} className="text-gray-500" /> Ustawienia kalendarza Apple
        </button>
      </MobileSheet>
```

Ikony `Calendar`, `UserPlus`, `Zap`, `Settings` są już importowane w tym pliku — sprawdź to przed dopisaniem importu, żeby nie zdublować.

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/MobileSheet.tsx apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): skrócony pasek i arkusz akcji na telefonie"
```

---

### Task 4: Menu godziny i popover blokady jako arkusze

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`

**Interfaces:**
- Consumes: `MobileSheet` z Task 3, `useIsMobile()` z Task 1, istniejące stany `slotMenu` i `blockPopover`.

- [ ] **Step 1: Wydziel treść menu godziny**

Menu godziny ma dziś pięć pozycji zapisanych bezpośrednio w bloku popovera. Żeby nie kopiować ich do arkusza, wydziel je do zmiennej. Nad `return (` w komponencie dopisz:

```tsx
  const slotMenuItems = slotMenu && (
    <>
      <button
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
        onClick={() => { setAddModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <Calendar size={15} className="text-primary" /> Dodaj wizytę
      </button>
      <button
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
        onClick={() => { setExternalModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <UserPlus size={15} className="text-violet-500" /> Klientka z zewnątrz
      </button>
      <button
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
        onClick={() => {
          const d = slotMenu.time ? new Date(`${slotMenu.date}T${slotMenu.time}`) : new Date(slotMenu.date);
          setHhPanelOpen(true);
          setHhPrefill({ date: d, hour: d.getHours(), minute: d.getMinutes() });
          setSlotMenu(null);
        }}
      >
        <Zap size={15} className="text-amber-500" /> Happy Hours
      </button>
      <button
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
        onClick={() => { setBlockModal({ date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <Lock size={15} className="text-gray-600" /> Zablokuj godziny
      </button>
      <button
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
        onClick={() => { setWorkHoursModal({ mode: 'add', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
      >
        <Clock size={15} className="text-green-600" /> Dodaj godziny pracy
      </button>
      {slotHasWorkingHours(slotMenu.date, slotMenu.time, slotMenu.employeeId) && (
        <button
          className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-accent"
          onClick={() => { setWorkHoursModal({ mode: 'remove', date: slotMenu.date, time: slotMenu.time, employeeId: slotMenu.employeeId }); setSlotMenu(null); }}
        >
          <Clock size={15} className="text-red-500" /> Usuń godziny pracy
        </button>
      )}
    </>
  );
```

Zwróć uwagę: to jest przeniesienie istniejących pozycji, z jedyną zmianą polegającą na dodaniu `min-h-11` i zamianie `w-full text-sm px-2 py-2` na wariant bez `py-2`. Nie zmieniaj ich zachowania ani kolejności. Jeśli w pliku któraś pozycja wygląda inaczej niż powyżej, wierne jest to, co jest w pliku — przenieś to, co tam zastaniesz.

- [ ] **Step 2: Renderuj menu jako arkusz na telefonie**

Zamień istniejący blok popovera menu (`{slotMenu && ( … )}`) na:

```tsx
      {slotMenu && (isMobile ? (
        <MobileSheet
          open
          onClose={() => setSlotMenu(null)}
          title={`${slotMenu.date}${slotMenu.time ? ` · ${slotMenu.time}` : ''}`}
        >
          {slotMenuItems}
        </MobileSheet>
      ) : (
        <div className="fixed inset-0 z-40" onClick={() => setSlotMenu(null)}>
          <div
            className="absolute z-50 w-56 rounded-xl border border-border bg-background p-2 shadow-2xl"
            style={{
              left: Math.min(slotMenu.x + 8, window.innerWidth - 240),
              top: Math.min(slotMenu.y + 8, window.innerHeight - 160),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 border-b px-2 py-1 font-mono text-xs text-muted-foreground">
              {slotMenu.date}{slotMenu.time ? ` · ${slotMenu.time}` : ''}
            </p>
            {slotMenuItems}
          </div>
        </div>
      ))}
```

- [ ] **Step 3: Popover blokady też jako arkusz**

Blok `{blockPopover && ( … )}` ma tę samą wadę pozycjonowania. Wydziel jego treść (zakres godzin, kogo dotyczy, powód, przycisk „Usuń blokadę") do zmiennej `blockPopoverContent` tuż obok `slotMenuItems`, przenosząc dosłownie to, co jest dziś w pliku, i podnosząc przycisk usuwania do `min-h-11`. Następnie zamień renderowanie na:

```tsx
      {blockPopover && (isMobile ? (
        <MobileSheet open onClose={() => setBlockPopover(null)} title="Zablokowane">
          {blockPopoverContent}
        </MobileSheet>
      ) : (
        <div className="fixed inset-0 z-40" onClick={() => setBlockPopover(null)}>
          <div
            className="absolute z-50 w-64 rounded-xl border border-border bg-background p-3 shadow-2xl"
            style={{
              left: Math.min(blockPopover.x, window.innerWidth - 280),
              top: Math.min(blockPopover.y + 6, window.innerHeight - 190),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {blockPopoverContent}
          </div>
        </div>
      ))}
```

Pozycjonowanie w gałęzi komputerowej ma zostać dokładnie takie, jakie jest dziś w pliku — jeśli różni się od powyższego, wierne jest to, co zastaniesz.

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx
git commit -m "feat(kalendarz): menu godziny i blokada jako arkusze na telefonie"
```

---

### Task 5: Panele boczne na pełny ekran

**Files:**
- Modify: `apps/web/src/components/calendar/CalendarView.tsx`
- Modify: `apps/web/src/components/calendar/HappyHourPanel.tsx`
- Modify: `apps/web/src/components/calendar/ClientDrawer.tsx`

- [ ] **Step 1: Marginesy kalendarza tylko od `md`**

W `CalendarView.tsx` blok odsuwający kalendarz ma dziś dwa warianty bez prefiksu `md:`, przez co na telefonie zostaje z kalendarza pasek około 40 px. Zamień:

```tsx
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
        selectedAppt && hhPanelOpen ? 'md:mr-[640px]' :
        selectedAppt ? 'md:mr-80' :
        hhPanelOpen ? 'md:mr-80' : ''
      }`}>
```

- [ ] **Step 2: Panel Happy Hours na pełną szerokość**

W `HappyHourPanel.tsx` znajdź kontener panelu (klasa zawiera `fixed top-0 right-0 h-full w-80 …`) i zamień `w-80` na `w-full md:w-80`.

W nagłówku panelu dodaj przycisk zamykania o rozmiarze dotykowym, widoczny tylko na telefonie, tuż przed istniejącą treścią nagłówka:

```tsx
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 border-b text-sm font-medium md:hidden"
          onClick={onClose}
        >
          Zamknij
        </button>
```

Jeśli komponent nie ma propa `onClose`, użyj tej funkcji, która zamyka panel w jego obecnej implementacji — sprawdź to w pliku, nie zgaduj.

- [ ] **Step 3: Przycisk zamykania karty klientki**

W `ClientDrawer.tsx` panel na telefonie zajmuje całą szerokość (`w-full md:w-80`), więc tło pod nim jest nieosiągalne palcem i zamknięcie tapnięciem obok nie działa — to nie jest do naprawienia przez zmianę warstw, bo nie ma czego dotknąć. Zamiast tego dodaj wyraźny przycisk zamykania na telefonie, jako pierwszy element wewnątrz kontenera panelu:

```tsx
        <button
          className="flex min-h-11 w-full items-center justify-center border-b text-sm font-medium md:hidden"
          onClick={onClose}
        >
          Zamknij
        </button>
```

Istniejący krzyżyk zostaw — na komputerze działa.

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/CalendarView.tsx apps/web/src/components/calendar/HappyHourPanel.tsx apps/web/src/components/calendar/ClientDrawer.tsx
git commit -m "feat(kalendarz): panele boczne na pełny ekran telefonu"
```

---

### Task 6: Przewijanie okien i widok listy wizyt

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/pages/admin/Appointments.tsx`

- [ ] **Step 1: Dodaj przewijanie arkuszom dolnym**

W `apps/web/src/index.css`, w regule zamieniającej okna panelu admina w arkusze dolne (blok `@media (max-width: 767px)`, selektor `.admin-main .fixed.inset-0 > div:not(.absolute):not([class*="inset-0"])`), dopisz do listy właściwości:

```css
    overflow-y: auto !important;
```

Bez tego okno ma ograniczoną wysokość, ale nie da się go przewinąć — przy rozwiniętej liście pracownic przycisk zapisu zostaje pod krawędzią ekranu.

- [ ] **Step 2: Pokaż przycisk edycji godziny na dotyku**

W `apps/web/src/pages/admin/Appointments.tsx` przycisk edycji czasu ma klasy `opacity-0 group-hover:opacity-100`, przez co na dotyku nie istnieje. Zamień je na:

```
"text-gray-400 hover:text-gray-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
```

- [ ] **Step 3: Pozwól prawej kolumnie wiersza się zawijać**

W tym samym pliku prawa kolumna wiersza listy (`<div className="flex items-center gap-3 shrink-0">`, około linii 265) wymusza szerokość większą niż ekran telefonu. Zamień jej klasy na:

```
"flex items-center gap-3 flex-wrap justify-end md:flex-nowrap md:shrink-0"
```

- [ ] **Step 4: Zweryfikuj build i lint**

```bash
cd apps/web && pnpm build && pnpm lint
```

Oczekiwane: oba czysto.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/index.css apps/web/src/pages/admin/Appointments.tsx
git commit -m "fix(kalendarz): przewijanie arkuszy i lista wizyt na dotyku"
```

---

### Task 7: Weryfikacja na wąskim ekranie

**Files:** brak zmian w kodzie, chyba że weryfikacja wykaże błąd.

- [ ] **Step 1: Pełny build i lint**

```bash
pnpm build
cd apps/web && pnpm lint
```

Oczekiwane: build wszystkich paczek OK, lint czysty.

- [ ] **Step 2: Przejście po interfejsie przy szerokości 390 px**

Uruchom `pnpm dev` z `cosmo-app/`, otwórz `/admin/wizyty` jako administratorka i przełącz przeglądarkę w tryb urządzenia mobilnego (390×844). Sprawdź po kolei:

1. kalendarz otwiera się na liście tygodnia, pasek ma sześć celów dotykowych w jednym rzędzie (strzałki, Dziś, Lista, Siatka, trzy kropki),
2. „Siatka" pokazuje jedną pracownicę na pełną szerokość, nad kalendarzem rząd imion, przełączanie działa, a przejście na kolejny dzień nie resetuje wyboru,
3. w siatce widać zielone tło tylko wybranej pracownicy, nie nałożone pasy wszystkich,
4. kliknięcie godziny wysuwa arkusz od dołu ze wszystkimi pozycjami widocznymi bez przewijania strony,
5. „Zablokuj godziny" oraz „Dodaj godziny pracy" otwierają okna, w których przy rozwiniętej liście pracownic przycisk zapisu jest osiągalny (okno się przewija),
6. kliknięcie istniejącej blokady otwiera arkusz z jej danymi i działającym usuwaniem,
7. trzy kropki otwierają arkusz akcji, a Happy Hours i ustawienia Apple otwierają się z niego,
8. panel Happy Hours i karta klientki zajmują pełny ekran i zamykają się przyciskiem „Zamknij",
9. w widoku listy ołówek przy godzinie jest widoczny bez najeżdżania, a strona nie przewija się w poziomie,
10. po obróceniu telefonu do poziomu układ reaguje bez przeładowania strony.

- [ ] **Step 3: Sprawdzenie, że komputer wygląda jak wcześniej**

Wyłącz tryb urządzenia mobilnego i przy szerokości 1440 px sprawdź: pasek narzędzi ma komplet przycisków jak przed zmianą, kliknięcie godziny otwiera popover przy kursorze (nie arkusz), kliknięcie nazwiska pracownicy nadal zoomuje, panele wysuwają się z boku i odsuwają kalendarz.

Zapisz w raporcie, które punkty przeszły, a które nie. Punkt, który nie przeszedł, zgłoś jako problem — nie obchodź go.

- [ ] **Step 4: Wdrożenie**

Wdrożenie wykonuje właściciel projektu — NIE uruchamiaj `deploy.sh` ani nie pushuj.

---

## Notatki dla wykonawcy

- `CalendarView.tsx` ma ponad 700 linii i pięć warstw zdarzeń (godziny pracy, wydarzenia Apple, blokady, wizyty, Happy Hours). Przed każdą zmianą przeczytaj okolicę, w którą wchodzisz — numery linii w tym planie mogą się przesuwać między zadaniami.
- Każda zmiana układu musi być albo pod `md:`, albo pod `isMobile`. Jeśli piszesz klasę bez żadnego z nich, zatrzymaj się i sprawdź, czy nie psujesz widoku na komputerze.
- Nie ruszaj `MarketingKalendar.tsx` — ma własne, niezależne wykrywanie szerokości i jest poza zakresem.
