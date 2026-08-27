# Import kalendarza Apple + blokowanie godzin w kalendarzu admina

Data: 2026-08-27

## Cel

Admin ma w kalendarzu wizyt widzieć na szaro swoje prywatne wydarzenia z kalendarza
Apple (iCloud), synchronizowane automatycznie w tle. Wydarzenia te są wyłącznie
informacyjne — nie blokują zapisów klientek. Niezależnie od tego admin może
kliknąć w godzinę w kalendarzu i utworzyć blokadę, która realnie uniemożliwia
klientkom zapis w tym czasie.

Dwie niezależne funkcje, wdrażane razem, bez żadnego powiązania logicznego:
podgląd kalendarza Apple nigdy nie tworzy blokad automatycznie.

## Część 1 — import kalendarza Apple (tylko podgląd)

### Źródło danych

Publiczny link subskrypcji iCloud (`webcal://p-XX.icloud.com/published/...`).
Admin generuje go w aplikacji Kalendarz: prawy klik na kalendarz → Udostępnij →
Kalendarz publiczny → kopiuj link. Bez logowania, bez haseł Apple ID w bazie,
dostęp wyłącznie do odczytu.

Odrzucone: CalDAV (przechowywanie działających danych logowania do iCloud),
ręczny upload `.ics` (brak automatycznego odświeżania).

### Przechowywanie

Serwer cyklicznie pobiera i parsuje `.ics`, zapisując wydarzenia do bazy.
Frontend czyta z bazy, nie z iCloud.

Odrzucone: proxy on-demand (otwarcie kalendarza zależne od dostępności iCloud,
pusto po restarcie serwera), parsowanie w przeglądarce (CORS iCloud blokuje).

### Model danych (Prisma)

```prisma
model ExternalCalendarSource {
  id                  String   @id @default(cuid())
  name                String   @default("Kalendarz Apple")
  url                 String
  isEnabled           Boolean  @default(true)
  syncIntervalMinutes Int      @default(15)
  lastSyncedAt        DateTime?
  lastSyncError       String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  events              ExternalCalendarEvent[]
}

model ExternalCalendarEvent {
  id        String   @id @default(cuid())
  sourceId  String
  source    ExternalCalendarSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  uid       String
  title     String
  startsAt  DateTime
  endsAt    DateTime
  isAllDay  Boolean  @default(false)
  location  String?

  @@unique([sourceId, uid, startsAt])
  @@index([startsAt, endsAt])
}
```

Klucz `(sourceId, uid, startsAt)` pozwala rozwinąć wydarzenia cykliczne (RRULE)
na pojedyncze wystąpienia bez duplikatów przy kolejnych synchronizacjach.

Zakres MVP: jedno globalne źródło (kalendarz właścicielki). Tabela źródeł jest
mimo to osobna, żeby dołożenie kolejnych linków później nie wymagało migracji
danych. UI obsługuje dokładnie jedno źródło.

### Moduł backendu

`apps/server/src/modules/external-calendar/` w standardowym układzie
`controller.ts` / `router.ts` / `service.ts`, plus `external-calendar.sync.ts`
ze schedulerem.

Przebieg synchronizacji (`syncSource(sourceId)`):

1. Zamień `webcal://` na `https://`, pobierz plik (timeout 15 s).
2. Sparsuj przez `node-ical` (`async.fromURL` / `sync.parseICS`), rozwiń RRULE.
3. Ogranicz do okna od −30 do +120 dni względem „dziś”.
4. Upsert każdego wystąpienia po `(sourceId, uid, startsAt)`.
5. Usuń z bazy wystąpienia z tego okna, których nie ma w świeżo pobranym pliku.
6. Zapisz `lastSyncedAt`, wyczyść `lastSyncError`.
7. Emituj `external-calendar:updated` przez Socket.IO do pokoju `admin:global`.

Błąd pobrania lub parsowania: zapis komunikatu do `lastSyncError`, brak zmian
w danych — w kalendarzu zostają ostatnie znane wydarzenia.

Scheduler: `initializeExternalCalendarSync()` wołane w `index.ts` obok
`initializeTreatmentSeriesMaintenance()`. `setInterval` co `syncIntervalMinutes`
(domyślnie 15), pierwsza synchronizacja przy starcie serwera.

Zależność do dodania: `node-ical` w `apps/server`.

### API

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| `GET` | `/api/external-calendar/source` | admin | konfiguracja + status synchronizacji |
| `PUT` | `/api/external-calendar/source` | admin | zapis URL / nazwy / włączenia |
| `DELETE` | `/api/external-calendar/source` | admin | odłączenie kalendarza (kasuje wydarzenia) |
| `POST` | `/api/external-calendar/sync` | admin | „Synchronizuj teraz” |
| `GET` | `/api/external-calendar/events?from&to` | admin | wydarzenia do wyrysowania |

### Frontend

**Konfiguracja** — link wkleja się w modalu `AppleCalendarSettingsModal`, otwieranym
ikoną koła zębatego w toolbarze kalendarza (`/admin/wizyty` → widok kalendarza):
pole na URL, status ostatniej synchronizacji, przycisk „Synchronizuj teraz”,
przycisk „Odłącz”, zwijana instrukcja skąd wziąć link.

**Wyświetlanie** — w `apps/web/src/components/calendar/CalendarView.tsx` dochodzi
trzecie źródło zdarzeń obok `workingHourEvents` i `appointmentEvents`. Wydarzenia
renderowane jako `display: 'background'` w bladej szarości, z tytułem, bez
`resourceId` — czyli pod wszystkimi kolumnami pracowników na całej szerokości.
Nieklikalne (`eventClick` ignoruje je tak jak dziś ignoruje Happy Hours).
Przełącznik „Apple” w toolbarze chowa/pokazuje warstwę, analogicznie do
istniejącego `showHappyHours`.

Nowy plik API: `apps/web/src/api/external-calendar.api.ts`.
Nasłuch `external-calendar:updated` przez istniejący `useSocket`, unieważniający
zapytanie o wydarzenia — otwarty kalendarz odświeża się sam po synchronizacji.

### Gwarancja braku wpływu na rezerwacje

`ExternalCalendarEvent` nie jest odczytywane w `employees.service.ts` ani
w `appointments.service.ts`. Warstwa wyłącznie wizualna, po stronie admina.

## Część 2 — blokowanie godzin

### Model danych (Prisma)

```prisma
model CalendarBlock {
  id           String   @id @default(cuid())
  startsAt     DateTime
  endsAt       DateTime
  reason       String?
  appliesToAll Boolean  @default(true)
  employees    Employee[] @relation("CalendarBlockEmployees")
  createdById  String?
  createdBy    User?    @relation(fields: [createdById], references: [id])
  createdAt    DateTime @default(now())

  @@index([startsAt, endsAt])
}
```

Wymaga pola zwrotnego w modelu `User`: `calendarBlocks CalendarBlock[]`, oraz
w `Employee`: `calendarBlocks CalendarBlock[] @relation("CalendarBlockEmployees")`.

Osobny byt zamiast modyfikowania `EmployeeWorkDay.timeBlocks`: blokadę można
cofnąć jednym kliknięciem bez rekonstruowania grafiku, a grafik pracy pozostaje
zapisem godzin pracy. Relacja `employees` używana wyłącznie gdy
`appliesToAll = false`.

Odrzucone: sztuczne wizyty typu BLOCK (zaśmiecają statystyki i finanse).

### Wpięcie w dostępność

W `getAvailabilityForDuration()` (`apps/server/src/modules/employees/employees.service.ts:339`),
po pobraniu istniejących wizyt, dochodzi zapytanie o blokady nachodzące na dany
dzień dla danego pracownika:

```
where: {
  startsAt: { lt: dayEnd },
  endsAt:   { gt: normalized },
  OR: [{ appliesToAll: true }, { employees: { some: { id: employeeId } } }],
}
```

Slot dostaje `available: false`, gdy `slotStart < block.endsAt && slotEnd > block.startsAt`
— ta sama logika nakładania co przy istniejących wizytach. Blokada stykająca się
końcem z początkiem slotu nie wycina go.

Ponieważ `createAppointment` oraz zmiana terminu
(`appointments.service.ts:986` i `:1031`) korzystają z `getAvailability`, blokady
działają automatycznie w kreatorze rezerwacji, w kalendarzu miesięcznym
i przy przekładaniu wizyt — bez zmian w tych miejscach.

### Zachowanie wobec istniejących wizyt

Blokada nigdy nie kasuje, nie odwołuje ani nie przekłada wizyt już umówionych.
Wstrzymuje wyłącznie nowe zapisy. Jeśli w zakresie tworzonej blokady są wizyty,
modal pokazuje ostrzeżenie z ich liczbą i informacją, że pozostaną bez zmian.

### API

Moduł `apps/server/src/modules/calendar-blocks/` w układzie
controller / router / service.

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| `GET` | `/api/calendar-blocks?from&to` | zalogowany pracownik lub admin | lista blokad w zakresie |
| `POST` | `/api/calendar-blocks` | admin | utworzenie |
| `DELETE` | `/api/calendar-blocks/:id` | admin | usunięcie |

Walidacja przy tworzeniu: `endsAt > startsAt`; gdy `appliesToAll = false`, lista
pracowników nie może być pusta. Naruszenie → `AppError` 400.

### Frontend

**Tworzenie** — w istniejącym menu slotu (`CalendarView.tsx:430`) dochodzi
czwarta pozycja **🔒 Zablokuj godziny**, obok „Dodaj wizytę”, „Klientka
z zewnątrz” i „Happy Hours”. Otwiera nowy komponent
`apps/web/src/components/calendar/BlockHoursModal.tsx`:

- data (prefill: kliknięty dzień),
- godzina od–do (prefill: kliknięta godzina + 60 min; przy zaznaczeniu zakresu
  myszką — dokładnie zaznaczony zakres),
- powód, opcjonalny, widoczny tylko dla personelu,
- zakres: `● Cały salon` / `○ Wybrani pracownicy` + checkboxy; gdy kliknięto
  w kolumnę konkretnego pracownika, jest on domyślnie zaznaczony przy drugim
  wariancie,
- ostrzeżenie o wizytach kolidujących z zakresem.

**Wyświetlanie** — blokady renderowane jako zwykłe (nie tłowe) eventy:
szrafurowane ciemnoszare tło, ikona kłódki, powód jako etykieta. Wizualnie
wyraźnie inne niż blade tło wydarzeń Apple. Blokada „cały salon” rysuje się na
całej szerokości (bez `resourceId`), blokada per-pracownik tylko w jego kolumnach.

**Usuwanie** — kliknięcie w blokadę otwiera popover: zakres godzin, kogo dotyczy,
powód, przycisk „Usuń blokadę”.

**Terminarz pracownika** — blokady widoczne w `/employee/terminarz` w trybie
tylko do odczytu (bez tworzenia i usuwania).

Nowy plik API: `apps/web/src/api/calendar-blocks.api.ts`.

## Testy

`apps/server/src/modules/employees/employees.availability.blocks.test.ts` (vitest):

1. blokada `appliesToAll` wycina pokrywane sloty każdemu pracownikowi,
2. blokada per-pracownik wycina sloty tylko jemu, pozostałym zostawia,
3. blokada kończąca się dokładnie w momencie startu slotu nie wycina tego slotu,
4. blokada w innym dniu nie wpływa na dostępność,
5. blokada częściowo nachodząca na slot wycina cały slot.

`apps/server/src/modules/external-calendar/external-calendar.sync.test.ts`:

1. parsowanie `.ics` z wydarzeniem cyklicznym daje osobne wystąpienia w oknie,
2. ponowna synchronizacja tego samego pliku nie tworzy duplikatów,
3. wydarzenie usunięte z pliku znika z bazy w obrębie okna,
4. błąd pobrania zapisuje `lastSyncError` i zostawia wcześniejsze wydarzenia.

## Kolejność wdrożenia

1. Migracja Prisma (obie tabele + `CalendarBlock`).
2. Backend blokad + wpięcie w `getAvailabilityForDuration` + testy.
3. Frontend blokad (modal, render, popover, menu slotu).
4. Backend importu Apple (parser, scheduler, API) + testy.
5. Frontend importu Apple (karta w Work.tsx, warstwa szarych wydarzeń, toggle).
6. `./deploy.sh` — najpierw backend (migracja), potem frontend.
