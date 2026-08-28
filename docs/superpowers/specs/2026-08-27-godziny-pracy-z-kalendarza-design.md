# Dodawanie godzin pracy z poziomu kalendarza admina

Data: 2026-08-27

## Cel

Admin ma móc kliknąć godzinę w kalendarzu wizyt i dodać godziny pracy — dla
wybranych pracownic albo dla całego salonu — dokładnie tym samym gestem, którym
dziś blokuje godziny. Godziny pracy mają być widoczne na zielonym tle z
etykietą „Dostępne godziny" i zakresem, a pomyłkę ma się dać cofnąć
kliknięciem w to tło.

Funkcja jest lustrzanym odbiciem blokad godzin
(`2026-08-27-kalendarz-apple-i-blokady-design.md`) i celowo powtarza ich
wzorce interakcji.

## Stan wyjściowy

Godziny pracy istnieją już w dwóch warstwach:

- `EmployeeWeeklySchedule` — stały grafik tygodniowy (dzień tygodnia →
  `timeBlocks`), edytowany w panelu pracownic,
- `EmployeeWorkDay` — wyjątek na konkretną datę (`isWorking`, `timeBlocks`),
  nadpisujący grafik dla tego dnia.

`buildWorkingHourEvents()` w `CalendarView.tsx` rysuje z tego zielone tło:
dla każdego dnia bierze wyjątek, a gdy go nie ma — grafik tygodniowy. To
rysowanie w kalendarzu jest jedynym miejscem, gdzie grafik tygodniowy wpływa
na widok — o faktycznej dostępności terminu dla klientki decyduje wyłącznie
`EmployeeWorkDay` (patrz sekcja „Semantyka scalania" i „Wpływ na
rezerwacje" niżej). Etykiety nie ma: `eventContent` zwraca `null` dla
`isWorkingHours` (`CalendarView.tsx:432`).

Zapis idzie przez istniejący `POST /api/employees/:id/schedule`
(`employeesApi.upsertWorkDay`), który **zastępuje** całą listę `timeBlocks`
dla danego dnia.

## Zakres zmiany: wyjątek na jeden dzień

Dodanie godzin z kalendarza zapisuje wyjątek na konkretną datę i nie rusza
stałego grafiku tygodniowego. Uzasadnienie: identyczne zachowanie jak przy
blokadach (klikam w dzień → zmieniam ten dzień), brak ryzyka przypadkowej
zmiany rytmu pracy na zawsze. Stały grafik pozostaje edytowany w panelu
pracownic.

Odrzucone: zapis do grafiku tygodniowego (nie da się zrobić jednorazowego
wyjątku), przełącznik „tylko dziś / co tydzień" w okienku (łatwo przypadkiem
nadpisać grafik na stałe, a korzyść jest marginalna wobec istniejącego panelu).

## Semantyka scalania — sedno poprawności

Naiwny zapis skasowałby istniejące godziny: `upsertWorkDay` zastępuje całą
listę, więc dodanie 14:00–16:00 zostawiłoby pracownicy dwie godziny pracy
zamiast dziewięciu, bez żadnego ostrzeżenia. Punktem wyjścia do scalania jest
wyłącznie wyjątek `EmployeeWorkDay` — grafik tygodniowy nigdy nie jest
odczytywany przy tym zapisie. `getAvailabilityForDuration()`, czyli silnik
dostępności terminów dla klientek, sam nie zagląda do grafiku tygodniowego,
więc scalanie musi trzymać się tego samego źródła; w przeciwnym razie
zapisany wyjątek nie odzwierciedlałby tego, co pracownica faktycznie miała
„wcześniej" z perspektywy rezerwacji.

Kolejność operacji przy dodawaniu zakresu dla jednej pracownicy:

1. Ustal aktualne godziny dnia z wyjątku `EmployeeWorkDay`, jeśli istnieje.
   Gdy wyjątku nie ma albo dzień jest oznaczony jako wolny — punktem
   wyjścia jest lista pusta (dzień bez wyjątku nie ma żadnych godzin
   dostępnych dla klientek, niezależnie od grafiku tygodniowego).
2. Dołóż nowy zakres do listy.
3. Scal: posortuj po godzinie startu i połącz przedziały nachodzące **oraz
   stykające się krańcami** (9:00–13:00 + 13:00–15:00 = 9:00–15:00).
4. Zapisz przez `upsertWorkDay` z `isWorking: true` — dodanie godzin do dnia
   oznaczonego jako wolny automatycznie go otwiera.

Usuwanie zakresu działa symetrycznie: odejmuje przedział od listy, co może
podzielić jeden blok na dwa (usunięcie 12:00–13:00 z 9:00–17:00 daje
9:00–12:00 i 13:00–17:00). Gdy po odjęciu nie zostaje nic, dzień zapisuje się
jako `isWorking: false` z pustą listą — inaczej zadziała fallback
`resolveEmployeeBlocks`, który dla dnia pracującego z pustą listą podstawia
domyślne 09:00–18:00 i godziny „wróciłyby" same.

Obie operacje to czyste funkcje na tablicach `TimeBlock` — bez Prismy, bez
sieci — objęte testami jednostkowymi, wzorem `calendar-blocks.rules.ts`.

## Zasięg: cały salon albo wybrane pracownice

„Cały salon" zapisuje ten sam zakres każdej aktywnej pracownicy osobno, każdej
scalając z jej własnymi godzinami — nie powstaje żaden wspólny byt „godziny
salonu". Dzięki temu model danych się nie zmienia i nie trzeba migracji.

Zapisy idą sekwencyjnie, jeden `upsertWorkDay` na pracownicę. Gdy część
zapisów się powiedzie, a część nie, okienko pokazuje, dla ilu pracownic się
udało, i nie zamyka się — admin widzi, co się stało, zamiast dostać cichy
częściowy skutek.

## Interfejs

**Dodawanie.** W menu slotu (`CalendarView.tsx`) dochodzi piąta pozycja
**„Dodaj godziny pracy"**, pod istniejącą „Zablokuj godziny". Otwiera
`WorkHoursModal` — bliźniaczo podobny do `BlockHoursModal`:

- data (wypełniona klikniętym dniem),
- od–do (wypełnione kliknięta godzina → +60 minut, przycięte do 23:59 jak
  w blokadach; przy zaznaczeniu zakresu myszką — dokładnie ten zakres),
- przełącznik `● Cały salon` / `○ Wybrane pracownice` + lista z zaznaczoną
  osobą, w której kolumnę kliknięto. Gdy kliknięto w kolumnę konkretnej
  pracownicy, okienko otwiera się na wariancie „Wybrane pracownice" z nią
  zaznaczoną — tak jak naprawiona wersja modala blokad.

**Etykieta na zielonym tle.** `eventContent` dla `isWorkingHours` przestaje
zwracać `null` i renderuje „Dostępne godziny" wraz z zakresem, drobnym
przygaszonym zielonym tekstem. Tło pozostaje tłem (`display: 'background'`) —
nie łapie kliknięć jako event i nie zabiera szerokości wizytom. Zakres godzin
trafia do `extendedProps` w `buildWorkingHourEvents`.

**Usuwanie.** Ponieważ tłowe zdarzenia nie generują `eventClick`, usuwanie
podpina się pod istniejące menu slotu: gdy kliknięta godzina mieści się w
godzinach pracy, w menu pojawia się dodatkowa pozycja **„Usuń godziny pracy"**,
otwierająca to samo okienko w trybie usuwania (ten sam formularz zakresu i
zasięgu, przycisk „Usuń"). Rozwiązanie omija ograniczenie FullCalendara i
zostawia wszystkie akcje w jednym, znanym już miejscu.

## Wpływ na rezerwacje

Zmiana dotyka `EmployeeWorkDay`, czyli tego samego źródła, z którego
`getAvailabilityForDuration()` liczy dostępność. Skutek jest zamierzony:
dodanie godzin pracy otwiera terminy dla klientek, usunięcie je zamyka.

Blokady godzin działają niezależnie i mają pierwszeństwo — slot objęty blokadą
pozostaje niedostępny, nawet jeśli mieści się w godzinach pracy. Wynika to z
istniejącej kolejności warunków w `getAvailabilityForDuration` i nie wymaga
zmian.

Istniejące wizyty nie są w żaden sposób ruszane. Usunięcie godzin pracy w
czasie, w którym stoi wizyta, nie odwołuje jej — okienko pokazuje ostrzeżenie
z liczbą kolidujących wizyt, tak jak modal blokad.

## Pliki

**Nowe**
- `apps/server/src/modules/employees/work-hours.rules.ts` — czyste funkcje
  `mergeTimeBlocks(blocks, added)` i `subtractTimeBlock(blocks, removed)`
- `apps/server/src/modules/employees/work-hours.rules.test.ts`
- `apps/web/src/components/calendar/WorkHoursModal.tsx`

**Modyfikowane**
- `apps/web/src/components/calendar/CalendarView.tsx` — dwie pozycje w menu
  slotu, etykieta na zielonym tle, zakres godzin w `extendedProps`
- `apps/server/src/modules/employees/employees.service.ts` — użycie funkcji
  scalających w nowej ścieżce zapisu

## Testy

`work-hours.rules.test.ts` (vitest, jednostkowe):

1. dodanie rozłącznego zakresu daje dwa bloki, posortowane,
2. dodanie zakresu nachodzącego scala w jeden,
3. dodanie zakresu stykającego się krańcem scala w jeden,
4. dodanie do pustej listy daje jeden blok,
5. dodanie zakresu zawartego w istniejącym nie zmienia nic,
6. odjęcie środka bloku dzieli go na dwa,
7. odjęcie krańca skraca blok,
8. odjęcie całego bloku zostawia pustą listę,
9. odjęcie zakresu spoza godzin pracy nie zmienia nic.
