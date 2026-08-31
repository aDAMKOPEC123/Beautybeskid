# Eksport wizyt do kalendarza Apple (subskrypcja ICS)

Data: 2026-08-31

## Cel

Wizyty z COSMO mają pojawiać się w prywatnym kalendarzu Apple właścicielki, na
bieżąco, bez ręcznego przepisywania. Domyka to kierunek zbudowany wcześniej:
kalendarz Apple → COSMO podaje prywatne wydarzenia do terminarza
([spec z 2026-08-27](./2026-08-27-kalendarz-apple-i-blokady-design.md)), a ten
spec dokłada COSMO → Apple. Efekt: w telefonie jeden kalendarz z życiem i pracą.

### Ograniczenie, które kształtuje całe rozwiązanie

**PWA nie może zapisywać do kalendarza iOS.** Nie istnieje przeglądarkowe API
do zapisu wydarzeń. Zostają dwie drogi: subskrypcja kalendarza (Apple sam
odpytuje adres) albo plik `.ics` pobierany per wizyta.

Wybrana jest subskrypcja, bo jako jedyna propaguje zmiany: przeniesienie terminu
i odwołanie wizyty docierają do telefonu same. Plik per wizyta tworzy kopię,
której późniejsza zmiana w COSMO już nie ruszy.

**Częstotliwość odświeżania ustawia użytkownik po stronie iOS**, przy
subskrybowanym kalendarzu (do wyboru od 5 minut do raz w tygodniu). Serwer może
podać feed aktualny co do sekundy i nie zmusi telefonu, żeby zaglądał częściej.
Domyślna wartość bywa bardzo rzadka, więc instrukcja ustawienia interwału jest
częścią funkcji, nie dodatkiem — bez niej wszystko wygląda na zepsute.

Zakres: backend plus jedna sekcja w istniejącym modalu ustawień. Bez zmian
w kalendarzu admina.

## Model danych

```prisma
model CalendarFeed {
  id             String    @id @default(cuid())
  token          String    @unique
  createdAt      DateTime  @default(now())
  lastAccessedAt DateTime?
  accessCount    Int       @default(0)
}
```

Jeden wiersz, tworzony leniwie przy pierwszym wejściu w ustawienia. Token to 32
losowe bajty z `crypto.randomBytes`, zakodowane base64url (43 znaki).

`lastAccessedAt` i `accessCount` nie są ozdobą. Gdy subskrypcja „nie działa",
pierwsze pytanie brzmi: czy Apple w ogóle po ten adres sięgnął. Bez tej
informacji jedyną metodą diagnozy jest czytanie logów serwera.

Wygenerowanie nowego tokenu nadpisuje pole `token` w tym samym wierszu — stary
link przestaje działać natychmiast, a historia dostępu zeruje się razem z nim.

## Endpoint

```
GET /api/calendar-feed/:token/wizyty.ics
```

**Publiczny, bez middleware'u autoryzacji.** Token jest jedynym poświadczeniem,
bo Apple odpytując subskrypcję nie wysyła nagłówka `Authorization`. To
świadoma, standardowa dla feedów ICS decyzja, a nie przeoczenie.

Token jest segmentem ścieżki, nie parametrem zapytania — parametry częściej
trafiają do logów proxy i historii przeglądarki. Rozszerzenie `.ics` w ostatnim
segmencie pomaga klientom kalendarza rozpoznać typ zawartości.

| Sytuacja | Odpowiedź |
|---|---|
| token poprawny | `200`, `Content-Type: text/calendar; charset=utf-8`, `Cache-Control: no-cache` |
| token nieznany | `404` |

Nieznany token dostaje `404`, a nie `401` — odpowiedź nie potwierdza, czy jakiś
token w ogóle istnieje.

**Token nigdy nie trafia do logów aplikacji.** Przy logowaniu żądań tej trasy
ścieżka musi być maskowana; w praktyce oznacza to brak `console.log` ze ścieżką
w kontrolerze feedu.

Każde udane pobranie inkrementuje `accessCount` i ustawia `lastAccessedAt`.

## Generator ICS

Nowy moduł `apps/server/src/modules/calendar-feed/ics.ts` z czystą funkcją:

```ts
export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  lastModified?: Date;
}
export function buildIcs(events: IcsEvent[], calendarName: string): string
```

`node-ical`, już obecne w zależnościach, jest **wyłącznie parserem** — nie ma
w nim generatora. Dokładanie kolejnej zależności dla kilkudziesięciu linii
tekstu jest nieproporcjonalne, a format ma dokładnie trzy pułapki, które i tak
trzeba obsłużyć świadomie:

1. **Końce linii CRLF.** RFC 5545 wymaga `\r\n`; klienty bywają wyrozumiałe,
   ale nie wszystkie.
2. **Zawijanie linii po 75 **bajtach**, nie znakach.** Polskie znaki w UTF-8
   zajmują dwa bajty, więc liczenie znaków rozjechałoby zawijanie na nazwiskach
   z „ą" czy „ż". Kontynuacja zaczyna się od pojedynczej spacji. Zawijanie nie
   może rozciąć znaku wielobajtowego w połowie.
3. **Escapowanie w polach tekstowych:** `\` → `\\`, `;` → `\;`, `,` → `\,`,
   znak nowej linii → `\n`.

### Daty w UTC

`DTSTART` i `DTEND` zapisywane w UTC z sufiksem `Z` (`20260903T120000Z`).

To decyzja podjęta świadomie po problemie, który wyszedł tego samego tygodnia:
VPS pracuje w UTC, a właścicielka w strefie warszawskiej. Zapis w UTC omija
strefy całkowicie — klient kalendarza przelicza je na czas lokalny telefonu.
Alternatywa, czyli `DTSTART;TZID=Europe/Warsaw`, wymagałaby dołączenia do pliku
pełnej definicji `VTIMEZONE` z regułami zmiany czasu i nie daje tu nic w zamian.

### Nagłówki kalendarza

`X-WR-CALNAME` z nazwą kalendarza, oraz `REFRESH-INTERVAL;VALUE=DURATION:PT15M`
i `X-PUBLISHED-TTL:PT15M`. To **podpowiedzi** dla klienta, nie gwarancja —
ostatnie słowo ma ustawienie po stronie iOS. Nic nie kosztują, a część klientów
je honoruje.

## Zawartość feedu

Okno: od 30 dni wstecz do 180 dni w przód względem chwili pobrania. Ograniczenie
wielkości pliku — Apple pobiera go w całości przy każdym odświeżeniu.

**Wizyty odwołane (`CANCELLED`) są pomijane.** Wydarzenie znika wtedy z telefonu
przy najbliższym odświeżeniu, co jest właściwym zachowaniem: odwołanej wizyty
nie ma.

| Pole ICS | Źródło |
|---|---|
| `UID` | `appointment-<id>@kosmetologwiktoriacwik.pl` |
| `DTSTART` | `appointment.date` |
| `DTEND` | `date` + `customDurationMinutes ?? service.durationMinutes` |
| `SUMMARY` | `<klientka> — <usługa> (<inicjały pracownicy>)` |
| `DESCRIPTION` | telefon, cena końcowa, status |
| `LOCATION` | `locationAddressAtBooking` |
| `LAST-MODIFIED` | `appointment.updatedAt` |

Nazwa klientki: `user.name`, a gdy wizyta jest „z zewnątrz" — `clientName`.
Telefon analogicznie: `user.phone` albo `clientPhone`. Gdy obu brak, pole
zostaje pominięte, a nie wypełnione pustym napisem.

Inicjały pracownicy liczone z `employee.name`; przy braku przypisanej pracownicy
nawias nie jest dodawany.

Adres bierze się z **wizyty**, nie z zaszytej stałej — salon ma wiele lokalizacji
(`SalonLocation`), a `locationAddressAtBooking` jest zapisany w chwili rezerwacji
i pozostaje prawdziwy nawet po zmianie danych lokalizacji.

**Stabilny `UID` jest kluczowy:** dzięki niemu przeniesienie terminu aktualizuje
istniejące wydarzenie zamiast tworzyć drugie obok.

## Ustawienia w aplikacji

Rozbudowa istniejącego `AppleCalendarSettingsModal`, który dziś obsługuje import
z Apple. Dochodzi druga sekcja — eksport:

- adres w dwóch wariantach: `webcal://` (tapnięcie otwiera Kalendarz od razu)
  i `https://` (do skopiowania), z przyciskiem kopiowania,
- „Ostatnio pobrany przez Apple: …" albo „jeszcze nigdy",
- **„Wygeneruj nowy link"** z potwierdzeniem i ostrzeżeniem, że stary przestanie
  działać,
- zwijana instrukcja: jak dodać subskrypcję na iPhonie i na Macu **oraz gdzie
  ustawić częstotliwość odświeżania**.

Instrukcja musi być w aplikacji, nie w dokumentacji. Interwał odświeżania
decyduje o tym, czy funkcja działa „na bieżąco", a jego domyślna wartość bywa
liczona w dniach — bez tej wskazówki wszystko wygląda na zepsute.

Przy adresie stoi ostrzeżenie: **ten link działa jak hasło.** Kto go ma, widzi
nazwiska i telefony klientek.

## API dla panelu

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| `GET` | `/api/calendar-feed/config` | admin | token, adresy, `lastAccessedAt`, `accessCount` |
| `POST` | `/api/calendar-feed/regenerate` | admin | nowy token, unieważnia stary |

Trasa publiczna (`/:token/wizyty.ics`) jest rejestrowana **przed** middlewarem
autoryzacji, a obie trasy panelu za nim.

## Bezpieczeństwo — podsumowanie

- Token: 32 losowe bajty, base64url; nieodgadywalny w praktyce.
- Endpoint publiczny z założenia — to cecha protokołu, nie luka.
- Unieważnienie natychmiastowe, jednym kliknięciem.
- Token nie trafia do logów aplikacji.
- Feed ujawnia nazwiska i telefony klientek każdemu, kto zna adres. Ostrzeżenie
  jest częścią interfejsu.

## Testy

`ics.test.ts` — `buildIcs`:

1. plik zaczyna się od `BEGIN:VCALENDAR` i kończy `END:VCALENDAR`,
2. wszystkie linie rozdzielone `\r\n`,
3. średnik, przecinek, odwrotny ukośnik i nowa linia w polu tekstowym są
   escapowane,
4. linia dłuższa niż 75 bajtów jest zawijana, a kontynuacja zaczyna się spacją,
5. zawijanie liczy bajty, nie znaki — linia z polskimi znakami tuż poniżej
   75 znaków, ale powyżej 75 bajtów, zostaje zawinięta,
6. zawijanie nie rozcina znaku wielobajtowego w połowie,
7. daty formatowane jako UTC z sufiksem `Z`,
8. pusta lista wydarzeń daje poprawny, pusty kalendarz.

`calendar-feed.service.test.ts`:

9. wizyty ze statusem `CANCELLED` nie trafiają do feedu,
10. `DTEND` liczy się z `customDurationMinutes`, gdy jest ustawione, a z
    `service.durationMinutes`, gdy go nie ma,
11. tytuł zawiera inicjały pracownicy, a przy jej braku nie ma pustego nawiasu,
12. wizyta „z zewnątrz" używa `clientName` i `clientPhone`.

## Pliki

| Plik | Zmiana |
|---|---|
| `apps/server/prisma/schema.prisma` | model `CalendarFeed` |
| `apps/server/prisma/migrations/…/migration.sql` | nowa tabela |
| `apps/server/src/modules/calendar-feed/ics.ts` | nowy — `buildIcs` |
| `apps/server/src/modules/calendar-feed/ics.test.ts` | nowy — testy generatora |
| `apps/server/src/modules/calendar-feed/calendar-feed.service.ts` | nowy — token, okno, składanie wydarzeń |
| `apps/server/src/modules/calendar-feed/calendar-feed.service.test.ts` | nowy — testy składania |
| `apps/server/src/modules/calendar-feed/calendar-feed.controller.ts` | nowy |
| `apps/server/src/modules/calendar-feed/calendar-feed.router.ts` | nowy |
| `apps/server/src/app.ts` | montaż trasy publicznej przed autoryzacją |
| `apps/web/src/api/external-calendar.api.ts` | wywołania konfiguracji feedu |
| `apps/web/src/components/calendar/AppleCalendarSettingsModal.tsx` | sekcja eksportu |

## Weryfikacja

1. Pobranie adresu `https://` w przeglądarce zwraca plik ICS z poprawnym
   nagłówkiem typu zawartości.
2. Nieznany token zwraca 404.
3. Dodanie subskrypcji na iPhonie — wizyty pojawiają się w Kalendarzu.
4. Ustawienie interwału odświeżania na 5 minut zgodnie z instrukcją w aplikacji.
5. Przeniesienie wizyty w COSMO — po odświeżeniu wydarzenie zmienia godzinę,
   a nie duplikuje się.
6. Odwołanie wizyty — wydarzenie znika.
7. Wizyta z polskimi znakami w nazwisku wyświetla się poprawnie (kontrola
   zawijania po bajtach).
8. „Wygeneruj nowy link" — stary adres zwraca 404, nowy działa.
9. `lastAccessedAt` rośnie po każdym odświeżeniu z telefonu.

## Kolejność wdrożenia

1. `ics.ts` + testy.
2. Model, migracja, `calendar-feed.service.ts` + testy.
3. Kontroler, router, montaż w `app.ts`.
4. Sekcja eksportu w modalu ustawień.
5. Weryfikacja, potem pełny `./deploy.sh` (backend i migracja).
