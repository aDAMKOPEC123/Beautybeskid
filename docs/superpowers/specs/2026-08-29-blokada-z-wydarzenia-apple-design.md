# Blokowanie godzin jednym kliknięciem z wydarzenia Apple

Data: 2026-08-29

## Cel

W kalendarzu admina (`/admin/wizyty`) wydarzenia z kalendarza Apple są dziś
wyłącznie informacyjne — szare tło, nieklikalne, bez wpływu na dostępność
(patrz [design z 2026-08-27](./2026-08-27-kalendarz-apple-i-blokady-design.md)).
Żeby prywatne wydarzenie faktycznie wstrzymało zapisy klientek, admin musi
osobno odnaleźć te same godziny w menu slotu i ręcznie utworzyć blokadę.

Ta zmiana skraca to do jednego kliknięcia: na każdym wydarzeniu Apple pojawia
się badge ❗, który otwiera istniejący `BlockHoursModal` z godzinami i tytułem
przepisanymi z wydarzenia. Gdy godziny są już zablokowane, badge zmienia się
w szarą 🔒 — admin widzi na pierwszy rzut oka, które prywatne wydarzenia są
zabezpieczone, a które nie.

Rozdział z designu z 2026-08-27 zostaje utrzymany: **import kalendarza Apple
nadal nigdy nie tworzy blokad automatycznie.** Blokada powstaje wyłącznie po
świadomym kliknięciu i zatwierdzeniu w modalu.

Zakres: wyłącznie frontend. Bez zmian w API, bez migracji Prisma.

## Rozbicie wydarzeń na dni

`AppleCalendarOverlay` tworzy dziś jeden `EventInput` na wydarzenie. Dochodzi
czysta funkcja `splitByDay(start, end)` tnąca wydarzenie na kawałki po dobie.

Konsekwencje:

- Wydarzenie wielodniowe (urlop 3–5 września) daje trzy osobne kafle, każdy
  z własnym badge'em. Każdy dzień blokuje się osobnym kliknięciem.
- Wydarzenie całodniowe z iCloud ma `start` = `00:00` danego dnia i `end` =
  `00:00` dnia następnego. Po rozbiciu wychodzi jeden kawałek `00:00`–`23:59`
  na dzień, więc prefill godzin dla wydarzeń całodniowych powstaje sam, bez
  osobnej gałęzi w kodzie.
- Każdy kafel zna własne, przycięte do doby godziny. Modal dostaje poprawny
  zakres bez odgadywania, w który dzień wielodniowego wydarzenia kliknięto.

Reguły cięcia:

- Kawałek nigdy nie przechodzi przez północ — górna granica to `23:59` danej
  doby. To warunek konieczny, bo `BlockHoursModal` operuje na jednej dacie
  i nie obsługuje blokad przez północ (`BlockHoursModal.tsx:17`); `23:59` jest
  też wartością, do której modal sam przycina wyliczony koniec
  (`addMinutesToTime`, `BlockHoursModal.tsx:22`).
- Koniec dokładnie o `00:00` nie generuje pustego kawałka na dzień następny.
- Wydarzenie w obrębie jednej doby przechodzi bez zmian, jako jeden kawałek.

Identyfikatory eventów zmieniają się na `apple-{eventId}-{dayIndex}`, a w widoku
zasobów na `apple-{eventId}-{dayIndex}-{employeeId}` — muszą pozostać unikalne,
bo kafli jest teraz więcej niż wydarzeń.

Do `extendedProps` każdego kafla dochodzą: `appleStart`, `appleEnd`,
`appleTitle`, `appleCovered`.

## Wykrywanie, że godziny są już zablokowane

Czysta funkcja `isCoveredByBlock(chunk, blocks)` zwraca `true`, gdy na liście
blokad jest choć jedna spełniająca łącznie:

- `appliesToAll === true`,
- `startsAt <= chunk.start`,
- `endsAt >= chunk.end`.

Dwie świadome decyzje:

- **Blokada obejmująca tylko wybrane pracownice nie liczy się jako pokrycie.**
  Wydarzenie Apple jest prywatnym wydarzeniem właścicielki, więc „zabezpieczone"
  oznacza, że cały salon nie przyjmuje zapisów w tych godzinach. Blokada na jedną
  osobę zostawia ❗.
- **Pokrycie częściowe to nadal ❗.** Blokada 14:00–15:00 przy wydarzeniu
  14:00–16:30 nie gasi wykrzyknika, bo połowa wydarzenia pozostaje otwarta na
  zapisy. Badge sygnalizuje wyłącznie pełne pokrycie.

Suma kilku blokad stykających się krawędziami nie jest traktowana jako pokrycie
— sprawdzana jest każda blokada z osobna. Przypadek jest marginalny, a
alternatywa (scalanie zakresów) dokłada logikę bez realnego zysku.

`CalendarView` pobiera już blokady w zapytaniu `['calendar-blocks', …]`
(`CalendarView.tsx:272`), więc trafiają one do overlaya nowym propem `blocks`.
Żadnego dodatkowego zapytania do API.

## Badge

Renderowany w `eventContent`, w gałęzi `appleEventId` (`CalendarView.tsx:691`),
w prawym górnym rogu kafla, obok istniejącego tytułu.

Warstwa Apple jest `display: 'background'` i ma taka pozostać — dzięki temu nie
przechwytuje `dateClick` ani zaznaczania zakresu myszką, czyli admin nadal może
zaznaczyć godziny pod wydarzeniem. Dlatego wrapper treści dostaje
`pointer-events: none`, a sam badge `pointer-events: auto`. Analogiczny zabieg
jest już w kodzie przy Happy Hours (`CalendarView.tsx:715`).

| Stan | Wygląd | Zachowanie |
|---|---|---|
| `appleCovered === false` | ❗ bursztynowy, `cursor: pointer`, `title="Zablokuj te godziny"` | otwiera `BlockHoursModal` |
| `appleCovered === true` | 🔒 szary, `pointer-events: none`, `title="Godziny są już zablokowane"` | nieklikalny |

Badge musi pozostać czytelny na wąskich kaflach — tytuł wydarzenia jest już
`truncate`, badge dostaje `shrink-0`, żeby nie zniknął przy długim tytule.

Uwaga wdrożeniowa: to, czy FullCalendar v6 przepuszcza kliknięcia do wnętrza
`fc-bg-event`, wymaga sprawdzenia w działającej aplikacji. Jeśli sama warstwa tła
ma `pointer-events: none` ustawione wyżej w drzewie, `pointer-events: auto` na
badge'u może nie wystarczyć i trzeba będzie podnieść `z-index` badge'a. Zakres
zmiany pozostaje ten sam.

## Prefill modalu

`BlockHoursModal` przyjmuje dziś `prefill: { date, time?, employeeId? }`.
Dochodzą dwa opcjonalne pola:

| Pole | Domyślnie | Źródło przy kliku w ❗ |
|---|---|---|
| `endTime` | `time + 60 min` (bez zmian) | godzina końca kafla |
| `reason` | `''` (bez zmian) | tytuł wydarzenia Apple |

Wartości domyślne są identyczne z dzisiejszymi, więc istniejące wywołanie z menu
slotu (`CalendarView.tsx:436`) działa bez żadnej zmiany.

Klik w ❗ ustawia: `date` i `time`/`endTime` z kafla, `reason` = tytuł
wydarzenia, zakres `● Cały salon` (bo `employeeId` pozostaje pusty — patrz
`BlockHoursModal.tsx:39`). Ostrzeżenie o kolidujących wizytach przelicza się
samo, bo `collidingCount` zależy od `from`/`to` (`BlockHoursModal.tsx:49`).

Admin może w modalu poprawić godziny i zawęzić zakres do wybranych pracownic —
prefill jest propozycją, nie decyzją.

## Testy

`apps/web` ma skonfigurowany vitest (`pnpm test`, przykład: `src/lib/axios.test.ts`).
Obie nowe funkcje są czyste, więc testowane bez renderowania kalendarza.

`splitByDay`:

1. wydarzenie w obrębie jednej doby zwraca jeden kawałek, niezmieniony,
2. wydarzenie trzydniowe zwraca trzy kawałki z poprawnymi krańcami,
3. wydarzenie całodniowe (`00:00` → następny dzień `00:00`) zwraca jeden
   kawałek `00:00`–`23:59`, bez pustego kawałka na dzień następny,
4. żaden kawałek nie przekracza granicy doby.

`isCoveredByBlock`:

1. blokada `appliesToAll` obejmująca cały kafel daje `true`,
2. blokada pokrywająca kafel częściowo daje `false`,
3. blokada per-pracownik obejmująca cały kafel daje `false`,
4. blokada kończąca się dokładnie na początku kafla daje `false`,
5. blokada o krańcach równych krańcom kafla daje `true`.

## Pliki

| Plik | Zmiana |
|---|---|
| `apps/web/src/components/calendar/appleCoverage.ts` | nowy — `splitByDay`, `isCoveredByBlock` |
| `apps/web/src/components/calendar/appleCoverage.test.ts` | nowy — testy obu funkcji |
| `apps/web/src/components/calendar/AppleCalendarOverlay.tsx` | prop `blocks`, rozbicie na dni, nowe `extendedProps` |
| `apps/web/src/components/calendar/CalendarView.tsx` | przekazanie `calendarBlocks` do overlaya, badge w `eventContent`, obsługa kliku |
| `apps/web/src/components/calendar/BlockHoursModal.tsx` | `endTime` i `reason` w `prefill` |

## Kolejność wdrożenia

1. `appleCoverage.ts` + testy (`pnpm test`).
2. `BlockHoursModal` — nowe pola `prefill`, wartości domyślne bez zmian.
3. `AppleCalendarOverlay` — prop `blocks`, rozbicie na dni, `extendedProps`.
4. `CalendarView` — badge i obsługa kliku.
5. Sprawdzenie w przeglądarce: klikalność badge'a na tle, zaznaczanie godzin pod
   wydarzeniem Apple nadal działa, wielodniowe wydarzenie ma badge na każdym dniu.
6. `./deploy.sh frontend`.
