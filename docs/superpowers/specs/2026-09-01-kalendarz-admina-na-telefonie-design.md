# Kalendarz admina na telefonie — przeprojektowanie układu

Data: 2026-09-01

## Cel

Na telefonie kalendarz admina jest praktycznie bezużyteczny: nad siatką stoi
około 690 px interfejsu, a na samą siatkę zostaje jakieś 200 px, czyli pięć
godzin. Zmierzone ze zrzutu ekranu przysłanego przez właścicielkę:

| Element | Wysokość |
|---|---|
| Nagłówek strony „Wizyty" + przycisk Menu | ~80 px |
| Baner „Włącz powiadomienia push" | ~50 px |
| Pasek `Lista` / `Siatka` / `⋯` | ~72 px |
| Rząd `← Wrzesień 2026 →` + `Dziś` | ~72 px |
| Zakładki tygodni | ~52 px |
| Rząd dni tygodnia | ~62 px |
| Legenda (rozwinięta, dwa rzędy) | ~90 px |
| Awatar pracownicy z nazwiskiem | ~85 px |

Zakres: wyłącznie układ na szerokościach poniżej progu `md` (768 px). Widok na
komputerze zostaje bez zmian.

**Żadna funkcja nie znika.** Zmienia się wyłącznie to, czy jest widoczna od razu,
czy o jedno tapnięcie. Pełna lista, która musi przetrwać: przełączanie
`Lista`/`Siatka`, nawigacja o tydzień, skok do wybranego tygodnia miesiąca, skok
do dnia, `Dziś`, przełączanie pracownicy, dodanie wizyty, klientka z zewnątrz,
Happy Hour, przełączniki Happy Hours i kalendarza Apple, ustawienia kalendarza
Apple, menu godziny z czterema pozycjami, blokady godzin z popoverem, panel
klientki, badge ❗ na wydarzeniach Apple.

## Dwie usterki wykryte przy okazji

Nie są kwestią projektu — są błędami i naprawiamy je niezależnie od reszty.

### Legenda dziedziczy stan z komputera

`CalendarLegend` trzyma stan rozwinięcia w jednym kluczu `localStorage`
(`cosmo-calendar-legend-open`), wspólnym dla wszystkich szerokości ekranu.
Domyślna wartość na telefonie jest „zwinięta", ale `useEffect` nadpisuje ją
zapisanym wyborem — więc rozwinięcie legendy na komputerze rozwija ją także na
telefonie, gdzie kosztuje 90 px z 200 px dostępnych na siatkę.

Naprawa: osobny klucz dla telefonu (`cosmo-calendar-legend-open-mobile`), żeby
oba układy pamiętały swój wybór niezależnie.

### Widok na telefonie nie jest tym, którego oczekuje kod

Awatar z nazwiskiem na zrzucie rysuje `resourceLabelContent`, a ta funkcja
wykonuje się wyłącznie w widoku z kolumnami zasobów. Tymczasem `switchToMobileGrid`
ustawia `timeGridDay` z zoomem na jedną pracownicę, przy którym `isResourceView`
jest fałszywe i żadne kolumny zasobów nie powstają.

Sprzeczności nie da się rozstrzygnąć z lektury kodu. Najbardziej prawdopodobne
wytłumaczenie to stara wersja podana przez service workera — w tej sesji
zdarzało się to wielokrotnie. **Pierwszym krokiem wdrożenia jest ustalenie
faktycznego stanu na świeżo załadowanej aplikacji**, a nie przyjęcie którejś
z hipotez.

Docelowo, niezależnie od wyniku tego sprawdzenia: **na telefonie siatka to
zawsze `timeGridDay` dla jednej pracownicy.** Kolumny zasobów na szerokości
390 px są nieczytelne przy więcej niż jednej osobie, a przy jednej osobie
nagłówek kolumny zajmuje 85 px, żeby powtórzyć informację, która nigdy się nie
zmienia.

## Górna belka — jeden rząd zamiast czterech

Nowy komponent `CalendarMobileBar`, zastępujący na telefonie pasek `Lista` /
`Siatka` / `⋯` oraz pierwszy rząd `CalendarPeriodNav`.

```
┌─────────────────────────────────┐
│ ◄   śr, 3 wrz ▾   ►   Ala ▾  ⓘ │
│  pn  wt  ŚR  cz  pt  So  Nd    │
└─────────────────────────────────┘
```

| Element | Zachowanie |
|---|---|
| `◄` `►` | przesuwają o tydzień, jak dziś |
| `śr, 3 wrz ▾` | tapnięcie otwiera arkusz z zakładkami tygodni miesiąca |
| `Dziś` | pojawia się **tylko gdy nie stoisz na dzisiejszym dniu** |
| `Ala ▾` | wybór pracownicy; przy jednej pracownicy sama nazwa, bez rozwijania |
| `ⓘ` | rozwija i zwija legendę |

Nazwa miesiąca znika jako osobny rząd — czytamy ją z daty. `Dziś` warunkowe, bo
zabiera miejsce dokładnie wtedy, gdy jest niepotrzebne: kiedy już jesteś na
dzisiaj.

Zakładki tygodni przenoszą się do arkusza otwieranego datą. Skok o tydzień
robią strzałki, skok w inne miejsce miesiąca — arkusz. Rząd dni zostaje na
wierzchu, bo to najczęstszy gest i jednocześnie jedyny wskaźnik, w którym
tygodniu jesteś.

**Rząd dni jest częścią `CalendarMobileBar`, nie pozostałością po
`CalendarPeriodNav`.** Ten drugi zostaje ukryty na telefonie w całości —
w przeciwnym razie oba komponenty rysowałyby dni jeden pod drugim. Obie
implementacje rzędu dni korzystają z tej samej funkcji `weekDays` z
`calendarWeeks.ts`, więc nie dublują logiki, tylko wygląd dopasowany do
szerokości.

Wysoki nagłówek z awatarem znika — tożsamość pracownicy przenosi się do belki.

## Pasek akcji na dole

Nowy komponent `CalendarMobileActions`, przyklejony do dolnej krawędzi.

```
┌─────────────────────────────────┐
│  Siatka   Lista    ➕     ⋯    │
└─────────────────────────────────┘
```

Uzasadnienie miejsca: na telefonie górna część ekranu jest najtrudniejsza do
dosięgnięcia kciukiem jedną ręką, a dziś leżą tam wszystkie główne akcje.

| Przycisk | Działanie |
|---|---|
| `Siatka` / `Lista` | przełącza widok, jak dziś |
| `➕` | otwiera dodanie wizyty — najczęstsza akcja, więc bez pośrednika |
| `⋯` | istniejący arkusz: klientka z zewnątrz, Happy Hour, przełączniki HH i Apple, ustawienia Apple |

Pasek respektuje `env(safe-area-inset-bottom)` — bez tego na iPhonie ze wskaźnikiem
gestu przyciski wchodziłyby pod niego. Obszar przewijania kalendarza dostaje
dolny odstęp równy wysokości paska plus bezpiecznemu marginesowi, żeby ostatnia
godzina nie chowała się za paskiem.

Z arkusza `⋯` znika pozycja „Dodaj wizytę", bo jest teraz przyciskiem `➕`.
Wszystkie pozostałe pozycje zostają.

## Bilans wysokości

| | Dziś | Po zmianie |
|---|---|---|
| Pasek widoków | 72 px | 0 (na dole) |
| Rząd miesiąca | 72 px | 0 |
| Zakładki tygodni | 52 px | 0 (w arkuszu) |
| Rząd dni | 62 px | ~56 px |
| Legenda | 90 px | 0 (zwinięta) |
| Nagłówek pracownicy | 85 px | 0 |
| Belka górna | — | ~52 px |
| **Razem nad siatką** | **~433 px** | **~108 px** |

Siatka rośnie z około pięciu godzin do jakichś dwunastu. Dolny pasek zabiera
~64 px, więc zysk netto to ~260 px.

## Czego zmiana nie rusza

Menu godziny po tapnięciu w slot, popover blokady, panel klientki, badge ❗,
przełączniki warstw, ustawienia kalendarza Apple, wszystkie modale, widok listy,
cały układ na komputerze oraz zachowanie synchronizacji z kalendarzem Apple.

## Testy

`apps/web` ma vitest. Logika nadająca się do testu jednostkowego:

`calendarMobile.test.ts` — `shouldShowTodayButton(anchor, today)`:

1. kotwica na dzisiejszym dniu daje `false`,
2. kotwica na innym dniu daje `true`,
3. kotwica z inną godziną tego samego dnia daje `false` — porównanie po dacie
   kalendarzowej, nie po sygnaturze czasu,
4. kotwica dzień wcześniej i dzień później daje `true`.

`CalendarLegend` — klucz zapamiętywania:

5. `storageKeyFor(isMobile: boolean)` zwraca różne klucze dla `true` i `false`,
   więc wybór na telefonie nie nadpisuje wyboru na komputerze.

Sam układ i przyklejenie paska są weryfikowane wzrokiem — to z definicji wizualne.

## Pliki

| Plik | Zmiana |
|---|---|
| `apps/web/src/components/calendar/calendarMobile.ts` | nowy — `shouldShowTodayButton`, `storageKeyFor` |
| `apps/web/src/components/calendar/calendarMobile.test.ts` | nowy — testy obu funkcji |
| `apps/web/src/components/calendar/CalendarMobileBar.tsx` | nowy — górna belka |
| `apps/web/src/components/calendar/CalendarMobileActions.tsx` | nowy — dolny pasek |
| `apps/web/src/components/calendar/CalendarWeekPickerSheet.tsx` | nowy — arkusz z tygodniami miesiąca |
| `apps/web/src/components/calendar/CalendarPeriodNav.tsx` | ukryty na telefonie |
| `apps/web/src/components/calendar/CalendarLegend.tsx` | klucz zapamiętywania zależny od szerokości |
| `apps/web/src/components/calendar/CalendarView.tsx` | wpięcie nowych komponentów, usunięcie mobilnego paska widoków, wymuszenie `timeGridDay` na telefonie, dolny odstęp obszaru przewijania |

## Weryfikacja

1. **Stan wyjściowy** — na świeżo załadowanej aplikacji (wyrejestrowany service
   worker) ustalić, w jakim widoku faktycznie startuje telefon i czy pojawia się
   nagłówek z awatarem. To rozstrzyga sprzeczność opisaną wyżej.
2. Górna belka mieści się w jednym rzędzie na szerokości 390 px, bez zawijania.
3. `Dziś` pojawia się po przejściu na inny dzień i znika po powrocie.
4. Tapnięcie daty otwiera arkusz z tygodniami; wybór tygodnia przenosi kalendarz.
5. Rząd dni przenosi między dniami; aktywny dzień podświetlony, weekend cieplejszy.
6. `ⓘ` rozwija legendę; po odświeżeniu strony pozostaje zwinięta, mimo że na
   komputerze jest rozwinięta.
7. Dolny pasek nie zasłania ostatniej godziny siatki.
8. Na iPhonie w trybie PWA pasek nie wchodzi pod wskaźnik gestu.
9. `➕` otwiera dodanie wizyty; `⋯` zawiera pozostałe pięć pozycji.
10. Menu godziny, popover blokady, panel klientki i badge ❗ działają jak dotąd.
11. Widok listy działa jak dotąd.
12. Układ na komputerze niezmieniony — porównać z obecnym stanem.

## Kolejność wdrożenia

1. `calendarMobile.ts` + testy; naprawa klucza legendy.
2. `CalendarWeekPickerSheet` — arkusz z tygodniami.
3. `CalendarMobileBar` + wpięcie, ukrycie `CalendarPeriodNav` na telefonie.
4. `CalendarMobileActions` + wpięcie, usunięcie mobilnego paska widoków,
   odstęp dolny obszaru przewijania.
5. Weryfikacja na telefonie, potem `./deploy.sh frontend`.
