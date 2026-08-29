# Nawigacja tygodniami, weekend, mocniejsza warstwa Apple, półgodziny na osi

Data: 2026-08-29

## Cel

Kalendarz admina (`/admin/wizyty`) po poprzedniej zmianie jest czytelny, ale
nadal nie mówi, **gdzie się jest w czasie**: `headerToolbar={false}` i nigdzie
nie ma podpisu okresu, więc po kliknięciu `←` lub `→` nie widać, na jaki dzień
ani tydzień się przeszło. Strzałki dodatkowo przesuwają o różną wielkość
zależnie od widoku — o dobę w widoku dnia, o tydzień w widoku tygodnia.

Cztery niezależne braki, wdrażane razem:

1. Brak orientacji w czasie i brak sposobu na skok do konkretnego tygodnia.
2. Sobota i niedziela nie różnią się niczym od dni roboczych.
3. Wydarzenia z kalendarza Apple giną wzrokowo — szare tło o kryciu 20 %
   i podpis 10 px w bladej szarości.
4. Oś czasu podpisuje wyłącznie pełne godziny, więc trafienie wzrokiem
   w konkretną półgodzinę wymaga liczenia.

Piąta zmiana dotyczy danych, nie wyglądu: kalendarz Apple synchronizuje się co
15 minut, co jest za rzadko, żeby zmiana wpisana w telefonie pojawiła się
w salonie „od razu".

Zakres: frontend plus jedna zmiana w schedulerze backendu i jedna migracja.

## 1. Pasek okresu z nawigacją tygodniami

Nowy komponent `apps/web/src/components/calendar/CalendarPeriodNav.tsx`,
umieszczony **nad legendą**, pod toolbarem.

```
  ←   Wrzesień 2026   →                          [Dziś]
  ┌───────┬────────┬────────┬────────┬────────┐
  │  1–6  │  7–13  │ 14–20  │ 21–27  │ 28–30  │
  └───────┴────────┴────────┴────────┴────────┘
    pn     wt     śr     cz     pt     So     Nd
     7      8      9     10     11     12     13
```

Rząd trzeci (dni tygodnia) renderuje się **tylko w widoku dnia**. W widoku
tygodnia i listy siatka sama pokazuje wszystkie dni, więc byłby zbędnym
powtórzeniem.

### Przeniesienie nawigacji z toolbara

Przyciski `←`, `→` i `Dziś` **przenoszą się** z toolbara do tego paska. To te
same przyciski i te same handlery — przeprowadzka, nie usunięcie. Zostawienie
ich w obu miejscach dołożyłoby bałaganu dokładnie tam, gdzie poprzednia zmiana
go usuwała. Toolbar zatrzymuje grupę widoków i grupę akcji; grupa nawigacji
z niego znika, bo w całości przechodzi do paska okresu.

Dotyczy to również toolbara mobilnego — tam `←`, `Dziś`, `→` też przechodzą do
paska okresu, żeby obie szerokości ekranu zachowywały się tak samo.

### Krok nawigacji

Strzałki przesuwają **o tydzień w każdym widoku**, przez
`calendarApi.incrementDate({ weeks: 1 })` zamiast `prev()` / `next()`, które
w widoku dnia skaczą o dobę. Konkretny dzień w obrębie tygodnia wybiera się
trzecim rzędem paska.

### Wyznaczanie tygodni

Czysta funkcja w nowym module `calendarWeeks.ts`:

```ts
export interface MonthWeek {
  start: Date;   // poniedziałek
  end: Date;     // niedziela
  label: string; // np. "7–13", "28–30"
}
export function weeksOfMonth(anchor: Date): MonthWeek[]
export function weekDays(anchor: Date): Date[]   // 7 dat, od poniedziałku
```

Reguły:

- Tydzień zaczyna się w poniedziałek — polska konwencja, zgodna z `locale="pl"`
  ustawionym już w FullCalendarze.
- Zwracane są wszystkie tygodnie, które mają choć jeden dzień w miesiącu
  kotwicy. Tydzień na przełomie miesięcy pojawia się więc w obu.
- Etykieta pokazuje **numery dni przycięte do miesiąca kotwicy**: tydzień
  31 sierpnia – 6 września w kontekście września ma etykietę `1–6`, a tydzień
  28 września – 4 października ma `28–30`.
- Dzień jednodniowej resztki miesiąca daje etykietę bez myślnika (`30`).

Aktywny tydzień to ten, który zawiera kotwicę. Kotwicą jest `rangeStart`
otrzymywane z `datesSet` — dla widoku dnia to ten dzień, dla widoku tygodnia
poniedziałek. Miesiąc w podpisie liczy się z kotwicy, więc tydzień na przełomie
miesięcy jest przypisany do miesiąca dnia, na którym faktycznie stoi kalendarz.

## 2. Weekend

Sobota i niedziela dostają cieplejsze tło kolumny i mocniejszy nagłówek —
w siatce (`.fc-day-sat`, `.fc-day-sun`) oraz w trzecim rzędzie paska okresu.

Odcień musi być **delikatniejszy niż przygaszenie godzin poza pracą**. Obie
warstwy nakładają się na siebie w weekend poza grafikiem; gdyby tło weekendu
było mocne, taki obszar wyszedłby ciemniejszy niż jakikolwiek inny i sugerował
znaczenie, którego nie ma.

## 3. Warstwa Apple

Nowe custom properties na `.cosmo-calendar`:

```css
--cal-apple-bg: hsl(265 35% 94%);
--cal-apple-stripe: hsl(265 30% 86%);
--cal-apple-border: hsl(265 30% 55%);
--cal-apple-text: hsl(265 35% 38%);
```

Wydarzenie Apple dostaje: tło w `--cal-apple-bg`, ukośne prążki
`--cal-apple-stripe` pod kątem **135°** (blokady mają 45° — inny kąt jest po to,
żeby obie szrafury nie myliły się wzrokowo), lewą krawędź 3 px w
`--cal-apple-border`, oraz tytuł pogrubiony w `--cal-apple-text` zamiast
dzisiejszego bladoszarego 10 px.

`AppleCalendarOverlay` przestaje ustawiać `color: 'rgba(107,114,128,0.20)'` na
evencie i zamiast tego nadaje klasę `cosmo-apple-event`. Kolor przechodzi
w całości do arkusza — jedno miejsce zamiast dwóch.

**Warstwa pozostaje `display: 'background'`.** To warunek konieczny: badge ❗
działa dzięki temu, że warstwa nie przechwytuje kliknięć, a admin może zaznaczyć
godziny pod wydarzeniem.

Uwaga do weryfikacji: paleta kolorów pracownic (`EMPLOYEE_COLORS`) zawiera
fiolet `#8b5cf6`. Wybrany odcień Apple jest wyraźnie mniej nasycony
(saturacja 30–35 % wobec 90 %), ale jeśli któraś pracownica ma akurat ten kolor,
warto sprawdzić wzrokiem, czy sąsiedztwo nie myli.

## 4. Półgodziny na osi czasu

`slotLabelInterval="00:30:00"` sprawia, że oś podpisuje 12:00, 12:30, 13:00…

Hierarchia wizualna **nie może** opierać się na klasie `fc-timegrid-slot-minor`:
przy `slotLabelInterval` równym `slotDuration` FullCalendar traktuje wszystkie
sloty jako główne i ta klasa znika. Zamiast tego dwa callbacki nadające klasy
na podstawie samej daty:

```ts
slotLaneClassNames={(arg) => [arg.date.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half']}
slotLabelClassNames={(arg) => [arg.date.getMinutes() === 0 ? 'cosmo-slot-full' : 'cosmo-slot-half']}
```

| Klasa | Podpis | Linia |
|---|---|---|
| `cosmo-slot-full` | większy, pogrubiony, `--foreground` | ciągła, **grubsza** |
| `cosmo-slot-half` | mniejszy, przygaszony, `--muted-foreground` | delikatna, kropkowana |

Zwiększenie grubości linii pełnej godziny domyka uwagę z poprzedniego review,
która została wtedy odłożona jako niemożliwa do rozstrzygnięcia bez obejrzenia:
kontrast opierał się wyłącznie na stylu linii, bez różnicy grubości.

## 5. Częstsza synchronizacja kalendarza Apple

### Backend

`initializeExternalCalendarSync` (`external-calendar.service.ts`) ma dziś
`setInterval(tick, 15 * 60 * 1000)` — interwał zaszyty na sztywno. Model
`ExternalCalendarSource` ma pole `syncIntervalMinutes`, które **nie jest przez
scheduler czytane w ogóle**.

Po zmianie: tick co 60 sekund sprawdza, czy `lastSyncedAt` jest starsze niż
`syncIntervalMinutes`, i dopiero wtedy synchronizuje. Zaleta wobec zmiany samej
stałej w `setInterval`: zmiana interwału w bazie działa bez restartu serwera,
a pole przestaje być martwe.

Interwał jest **przycinany do przedziału 2–60 minut**. Dolna granica chroni
iCloud przed odpytywaniem częstszym, niż ma sens dla kalendarza aktualizowanego
ręcznie przez człowieka; górna zabezpiecza przed przypadkowym wpisaniem wartości,
która praktycznie wyłączyłaby synchronizację.

### Migracja

Domyślna wartość `syncIntervalMinutes` schodzi z 15 na 5, a istniejące wiersze
mające jeszcze starą domyślną piętnastkę są aktualizowane do pięciu. W bazie
jest jeden taki wiersz (jedno źródło w MVP). `deploy.sh` robi zrzut bazy przed
wdrożeniem, a `prisma migrate deploy` uruchamia migrację.

### Frontend

W `AppleCalendarOverlay` zapytanie o wydarzenia dostaje `staleTime` 60 sekund
zamiast 5 minut oraz `refetchOnWindowFocus: true` i `refetchOnMount: true` —
dane odświeżają się przy wejściu na stronę i po powrocie do zakładki.
Nasłuch `external-calendar:updated` przez Socket.IO zostaje bez zmian: po
zakończonej synchronizacji serwera otwarty kalendarz i tak odświeża się sam.

### Deploy

Ta część wymaga wdrożenia backendu wraz z migracją, czyli `./deploy.sh`
(pełny), nie `./deploy.sh frontend`.

## Czego ta zmiana nie rusza

Nie znika żaden przycisk ani żadna ścieżka działania. `←`, `→` i `Dziś`
zmieniają miejsce i krok, ale zachowują handlery. Legenda, warstwy godzin pracy,
kafle wizyt, blokady, Happy Hours, menu slotu, popover blokady, badge ❗ oraz
wszystkie modale pozostają bez zmian.

## Testy

`apps/web` ma skonfigurowany vitest.

`calendarWeeks.test.ts` — `weeksOfMonth`:

1. wrzesień 2026 (1. dnia wypada wtorek) daje pięć tygodni z etykietami
   `1–6`, `7–13`, `14–20`, `21–27`, `28–30`,
2. miesiąc zaczynający się w poniedziałek nie produkuje tygodnia zerowego,
3. luty roku nieprzestępnego kończy się etykietą kończącą się na 28,
4. grudzień daje ostatni tydzień przycięty do 31, mimo że sięga stycznia,
5. tydzień na przełomie miesięcy występuje w obu miesiącach, z różnymi
   etykietami,
6. jednodniowa resztka miesiąca daje etykietę bez myślnika.

`weekDays`:

7. zwraca siedem kolejnych dat,
8. pierwsza z nich to poniedziałek, niezależnie od tego, który dzień podano.

Skórka, pasek okresu i warstwa Apple nie dostają testów jednostkowych — są
weryfikowane wzrokiem, bo to, co mają zapewnić, jest z definicji wizualne.

## Pliki

| Plik | Zmiana |
|---|---|
| `apps/web/src/components/calendar/calendarWeeks.ts` | nowy — `weeksOfMonth`, `weekDays` |
| `apps/web/src/components/calendar/calendarWeeks.test.ts` | nowy — testy |
| `apps/web/src/components/calendar/CalendarPeriodNav.tsx` | nowy — pasek okresu |
| `apps/web/src/components/calendar/CalendarView.tsx` | pasek okresu, nawigacja tygodniami, usunięcie grupy nawigacji z obu toolbarów, callbacki klas slotów, `slotLabelInterval` |
| `apps/web/src/components/calendar/AppleCalendarOverlay.tsx` | klasa `cosmo-apple-event` zamiast inline `color`, opcje odświeżania zapytania |
| `apps/web/src/components/calendar/calendar.css` | weekend, warstwa Apple, klasy slotów pełnej i pół godziny |
| `apps/server/src/modules/external-calendar/external-calendar.service.ts` | tick co 60 s, interwał z bazy, przycięcie do 2–60 min |
| `apps/server/prisma/migrations/…/migration.sql` | nowa — domyślna wartość 15 → 5 plus aktualizacja istniejących wierszy |

## Weryfikacja

1. **Pasek okresu** — podpis miesiąca zgodny z widoczną datą; kliknięcie
   w zakładkę tygodnia przenosi kalendarz; aktywny tydzień podświetlony.
2. **Krok tygodniowy** — strzałki przesuwają o siedem dni w widoku dnia,
   tygodnia i listy.
3. **Rząd dni** — widoczny wyłącznie w widoku dnia; kliknięcie w dzień
   przenosi; aktywny dzień podświetlony.
4. **`Dziś`** — wraca do dzisiejszej daty w każdym widoku.
5. **Weekend** — sobota i niedziela wyróżnione w siatce i w pasku dni;
   weekend poza godzinami pracy nie robi się nadmiernie ciemny.
6. **Apple** — wydarzenia wyraźnie widoczne; badge ❗ nadal klikalny; kłódka
   nadal z tooltipem; zaznaczanie godzin pod wydarzeniem nadal działa.
7. **Sync** — zmiana wpisana w kalendarzu Apple pojawia się w ciągu ~5 minut
   bez odświeżania strony; powrót do zakładki odświeża dane natychmiast.
8. **Oś czasu** — podpisy co pół godziny, pełne godziny wyraźniejsze; linia
   pełnej godziny grubsza od półgodzinnej.
9. **Nic nie zginęło** — każdy pozostały przycisk toolbara kliknięty raz,
   menu slotu z czterema pozycjami, popover blokady, wszystkie cztery widoki.
10. **Telefon** (390 px) — pasek okresu czytelny i przewijalny w poziomie,
    wysokości dotykowe zachowane.

## Kolejność wdrożenia

1. `calendarWeeks.ts` + testy.
2. `CalendarPeriodNav.tsx` + wpięcie w `CalendarView`, przeniesienie nawigacji
   z obu toolbarów, krok tygodniowy.
3. Oś czasu — `slotLabelInterval` i callbacki klas slotów + style.
4. Weekend i warstwa Apple w `calendar.css` + klasa w `AppleCalendarOverlay`.
5. Backend — scheduler i migracja; frontend — opcje odświeżania zapytania.
6. Weryfikacja w przeglądarce, potem `./deploy.sh` (pełny, z migracją).
