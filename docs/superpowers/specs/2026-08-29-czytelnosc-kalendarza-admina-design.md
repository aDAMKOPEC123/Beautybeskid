# Czytelność kalendarza admina — skórka, legenda, gęstość kafli

Data: 2026-08-29

## Cel

Kalendarz admina (`/admin/wizyty`) jest nieczytelny i wizualnie obcy wobec reszty
aplikacji. Trzy konkretne przyczyny, potwierdzone w kodzie:

1. **Zero reguł CSS.** W `apps/web/src/index.css` nie ma ani jednej reguły
   dotyczącej FullCalendara. Kalendarz renderuje się w domyślnej skórce
   biblioteki, podczas gdy aplikacja ma własny system tokenów (leśna zieleń
   `--primary: 142 33% 36%`, kość słoniowa `--background`, espresso
   `--foreground`, `--radius: 0.5rem`). Komponent wygląda jak wklejony z innego
   projektu.
2. **Godziny pracy są niewidoczne.** `buildWorkingHourEvents`
   (`CalendarView.tsx:33`) maluje je zielenią o kryciu 18 % z podpisem 10 px
   w `text-green-700/70`.
3. **Sześć języków wizualnych bez legendy.** Godziny pracy, wizyty barwione
   statusem, blokady, wydarzenia Apple, Happy Hours i kolory pracownic
   współistnieją na jednej siatce i nic ich nie tłumaczy.

Dodatkowo `AppointmentCard` renderuje siedem linii tekstu po 11 px w kaflu,
który przy wizycie 30-minutowej ma około 30 px wysokości — reszta jest przycinana
przez `overflow: hidden`, więc tekst urywa się w połowie.

**Nic nie zostaje usunięte.** Każdy istniejący przycisk, widok i ścieżka
działania pozostaje. Zmiana jest wyłącznie prezentacyjna plus jeden nowy
przełącznik warstwy.

Zakres: wyłącznie frontend. Bez zmian w API, bez migracji Prisma, bez nowych
zależności.

## Gdzie mieszka styl

Nowy plik `apps/web/src/components/calendar/calendar.css`, importowany przez
`CalendarView.tsx`. Wszystkie reguły zagnieżdżone pod klasą `.cosmo-calendar`,
nakładaną na kontener kalendarza.

Powód osobnego pliku: `index.css` ma 415 linii stylów globalnych i zero reguł
FullCalendara. Dopisanie tam stu reguł skórki utopiłoby je wśród stylów
niezwiązanych z kalendarzem. Plik obok komponentu mówi wprost, gdzie mieszka
wygląd kalendarza, a klasa `.cosmo-calendar` gwarantuje, że nadpisania nie
wyciekną na ewentualne inne instancje FullCalendara w aplikacji.

Kolory statusów definiowane jako custom properties na `.cosmo-calendar`, żeby
`AppointmentCard`, legenda i skórka czerpały z jednego źródła:

```css
.cosmo-calendar {
  --cal-status-pending:     hsl(35 70% 38%);
  --cal-status-confirmed:   hsl(142 33% 36%);   /* = --primary, zieleń marki */
  --cal-status-completed:   hsl(135 15% 42%);   /* = --muted-foreground */
  --cal-status-cancelled-bg:   hsl(0 25% 93%);
  --cal-status-cancelled-text: hsl(0 30% 38%);
  --cal-offhours:           hsl(150 37% 16% / 0.07);
}
```

Kontrast tekstu na wypełnieniu: biały na `pending` ≈ 5,0:1, na `confirmed`
≈ 5,3:1, na `completed` ≈ 4,7:1 — wszystkie ponad progiem WCAG AA dla tekstu
o normalnej wielkości. Anulowana jako jedyna dostaje jasne tło z ciemnym
tekstem, bo ma się cofać, a nie krzyczeć.

## Godziny pracy — odwrócona logika

`buildWorkingHourEvents` zostaje zastąpione przez `buildWorkingHourLayer`
o tej samej sygnaturze wejściowej, zwracające **dwa rodzaje** zdarzeń tła:

- `isWorkingHours: true` — **bez wypełnienia** (tło kalendarza prześwituje),
  wyraźna pionowa linia 3 px w kolorze pracownicy przy lewej krawędzi, czytelny
  podpis zakresu. Brak wypełnienia jest istotą odwrócenia: kolory wizyt i Happy
  Hours nie mają już z czym konkurować,
- `isOffHours: true` — przygaszenie w `--cal-offhours`, liczone jako
  **dopełnienie** bloków pracy w oknie doby widocznym w siatce.

### Konsekwencja, która jest zyskiem

Dzień, w którym pracownica w ogóle nie pracuje, dziś kończy się instrukcją
`continue` (`CalendarView.tsx:53,58`) — nie powstaje żaden event, więc kolumna
wygląda identycznie jak dzień roboczy bez wizyt. Po zmianie cała jej kolumna
jest przygaszona i nieobecność widać natychmiast.

### Funkcja czysta i wspólna stała okna

Dopełnienie liczy osobna czysta funkcja:

```ts
export interface TimeRange { start: string; end: string }  // "HH:mm"
export function invertRanges(
  blocks: TimeRange[],
  windowStart: string,
  windowEnd: string,
): TimeRange[]
```

Reguły: bloki nieposortowane są sortowane przed liczeniem; bloki nachodzące na
siebie są scalane; blok wystający poza okno jest przycinany; pusta lista bloków
daje całe okno jako jedną lukę; luka o zerowej długości nie jest zwracana.

Okno doby (`07:00`–`21:00`) jest dziś zapisane wyłącznie w propsach
FullCalendara (`slotMinTime` / `slotMaxTime`, `CalendarView.tsx:749`).
`buildWorkingHourLayer` musi używać dokładnie tych samych granic, inaczej
przygaszenie rozjedzie się z siatką. Dlatego wartości przenoszą się do
eksportowanych stałych `DAY_WINDOW_START` / `DAY_WINDOW_END` w nowym module,
a `CalendarView` czyta `slotMinTime` / `slotMaxTime` z nich. Jedno źródło prawdy.

## Legenda

Nowy komponent `apps/web/src/components/calendar/CalendarLegend.tsx` — poziomy
pasek między toolbarem a siatką, składany przyciskiem, stan zapamiętany
w `localStorage` pod kluczem `cosmo-calendar-legend-open`.

Na telefonie legenda jest domyślnie **zwinięta** — na wąskim ekranie każdy piksel
wysokości siatki jest cenny. Na desktopie domyślnie rozwinięta. Domyślna wartość
dotyczy wyłącznie pierwszej wizyty; potem decyduje zapamiętany wybór.

| Pozycja | Próbka | Klikalna |
|---|---|---|
| Godziny pracy | pas z pionową linią akcentu | tak — chowa warstwę przygaszenia |
| Wizyta oczekująca | wypełnienie `--cal-status-pending` | nie |
| Wizyta potwierdzona | wypełnienie `--cal-status-confirmed` | nie |
| Wizyta zrealizowana | wypełnienie `--cal-status-completed` | nie |
| Wizyta anulowana | jasne tło, tekst przekreślony | nie |
| Blokada godzin | ciemna szrafura z kłódką | nie |
| Kalendarz Apple | szare tło z badge'em ❗ | tak — ten sam stan co `showApple` |
| Happy Hours | bursztynowe obramowanie górne | tak — ten sam stan co `showHappyHours` |

Pozycje klikalne w stanie wyłączonym są wyszarzone i mają `aria-pressed`.
Pozycje informacyjne nie są przyciskami — nie mają `cursor: pointer` ani roli,
żeby nie sugerować interakcji, której nie ma.

### Relacja do istniejących przycisków

Przyciski „Pokaż/Ukryj HH" i „Pokaż/Ukryj Apple" **zostają w toolbarze**
i dzielą stan z legendą — to te same `showHappyHours` / `showApple`. Legenda
dokłada drugą drogę do tego samego przełącznika, w miejscu, w którym użytkownik
i tak patrzy na kolor. Nic nie jest przenoszone ani usuwane.

`showWorkingHours` to jedyny nowy stan w tej zmianie. Nie dostaje przycisku
w toolbarze — jest wyłącznie w legendzie, bo tam ma sens: klika się w próbkę
tego, co chce się schować.

## Kafle wizyt

`AppointmentCard` dostaje czystą funkcję gęstości w osobnym module:

```ts
export type CardDensity = 'compact' | 'medium' | 'full';
export function cardDensity(durationMinutes: number): CardDensity
```

Progi: poniżej 45 minut `compact`, od 45 do 89 `medium`, od 90 `full`.
Wartości nieliczbowe, ujemne i zerowe dają `compact` — to bezpieczny domyślny
wybór, bo pokazuje najmniej i nigdy nie przepełni kafla.

| Gęstość | Zawartość |
|---|---|
| `compact` | godzina rozpoczęcia + nazwisko w jednej linii, ikony ostrzegawcze |
| `medium` | to co wyżej + nazwa usługi |
| `full` | pełen zakres godzin, nazwisko, usługa, cena, etykieta statusu, inicjały pracownicy, telefon |

Liczone z **długości wizyty, nie z pikseli**: FullCalendar v6 nie podaje
wiarygodnej wysokości w `eventContent` — mówi o tym komentarz w
`AppointmentCard.tsx:33`, postawiony przy poprzednim podejściu do tego problemu.
Długość jest stabilnym przybliżeniem i daje się przetestować bez renderowania.

**Ikony alergii ⚠️ i notatek 📝 są widoczne we wszystkich trzech gęstościach.**
To sygnały bezpieczeństwa klientki, nie ozdoba — nigdy nie mogą wypaść przez
brak miejsca.

Żadne pole nie znika z aplikacji: komplet danych pozostaje dostępny po
kliknięciu w wizytę, w istniejącym `ClientDrawer`.

## Skórka siatki

| Element | Dziś | Po zmianie |
|---|---|---|
| Nagłówki kolumn z pracownicami | domyślne, cienkie | większa waga, oddech, kolor `--foreground` |
| Linia pełnej godziny | identyczna jak półgodzinna | wyraźniejsza — godziny dają się policzyć wzrokiem |
| Linia półgodzinna | jak wyżej | delikatna, `--border` |
| Kolumna „dziś" | brak wyróżnienia | subtelne tło `--secondary` |
| Wskaźnik bieżącej godziny | domyślna czerwień FullCalendara | `--primary` |
| Narożniki i obramowania | ostre, domyślne | `--radius`, kolor `--border` |

## Toolbar

Trzy grupy rozdzielone pionowymi separatorami, w kolejności odpowiadającej
częstości użycia:

1. **Nawigacja** — `←` / `Dziś` / `→`
2. **Widoki** — `Dzień` / `Tydzień` / `Lista` (+ `← Wszyscy` gdy aktywny zoom)
3. **Akcje** — `+ Wizyta`, `+ Klientka z zewnątrz`, `⭐ Happy Hour`,
   `Pokaż/Ukryj HH`, `Pokaż/Ukryj Apple`, ustawienia kalendarza Apple

Kolory schodzą z surowego Tailwinda (`bg-green-600`, `bg-violet-600`,
`bg-amber-500`, `bg-yellow-400`, `bg-indigo-600`) na paletę aplikacji: zieleń
marki dla akcji głównych, neutralne tła dla przełączników, stan aktywny
przełącznika sygnalizowany wypełnieniem, nie zmianą odcienia na losowy kolor.

**Żaden przycisk nie znika i żaden nie zmienia działania.** Zmiana dotyczy
wyłącznie grupowania i kolorów.

Toolbar mobilny (`CalendarView.tsx:520-556`) i arkusz akcji mobilnych zostają
funkcjonalnie bez zmian — dostają wyłącznie spójne kolory z palety.

## Testy

`apps/web` ma skonfigurowany vitest (`pnpm test`).

`calendarLayers.test.ts` — `invertRanges`:

1. pusta lista bloków daje całe okno jako jedną lukę,
2. jeden blok w środku okna daje dwie luki,
3. blok stykający się z początkiem okna daje jedną lukę po jego prawej,
4. bloki podane w odwrotnej kolejności dają ten sam wynik co posortowane,
5. bloki nachodzące na siebie są scalane, nie dają luki zerowej długości,
6. blok pokrywający całe okno daje pustą listę luk,
7. blok wystający poza okno jest przycinany do jego granic.

`cardDensity.test.ts`:

1. 30 minut daje `compact`,
2. 44 minuty dają `compact`, 45 daje `medium` (próg dokładnie na granicy),
3. 89 minut daje `medium`, 90 daje `full`,
4. `0`, wartość ujemna i `NaN` dają `compact`.

Skórka CSS i legenda nie dostają testów jednostkowych — są weryfikowane
w przeglądarce, bo to, co mają zapewnić, jest z definicji wizualne.

## Pliki

| Plik | Zmiana |
|---|---|
| `apps/web/src/components/calendar/calendar.css` | nowy — skórka i custom properties |
| `apps/web/src/components/calendar/calendarLayers.ts` | nowy — `invertRanges`, `buildWorkingHourLayer`, stałe okna doby |
| `apps/web/src/components/calendar/calendarLayers.test.ts` | nowy — testy `invertRanges` |
| `apps/web/src/components/calendar/cardDensity.ts` | nowy — `cardDensity` |
| `apps/web/src/components/calendar/cardDensity.test.ts` | nowy — testy progów |
| `apps/web/src/components/calendar/CalendarLegend.tsx` | nowy — składana legenda z przełącznikami |
| `apps/web/src/components/calendar/CalendarView.tsx` | import CSS, klasa kontenera, nowa warstwa, legenda, stan `showWorkingHours`, grupowanie toolbara, `slotMinTime`/`slotMaxTime` ze stałych |
| `apps/web/src/components/calendar/AppointmentCard.tsx` | gęstość, kolory statusów z custom properties |

## Weryfikacja

Poza testami jednostkowymi, `tsc --noEmit` i `pnpm build`, przejście przez
wszystkie widoki z potwierdzeniem, że nic nie zginęło:

1. **Dzień z kolumnami pracownic** — przygaszenie poza godzinami pracy, akcent
   przy lewej krawędzi pasa pracy, kolumna nieobecnej pracownicy przygaszona
   w całości.
2. **Tydzień** — te same warstwy w widoku bez zasobów.
3. **Lista** — widok listy nie ma siatki; potwierdzić, że skórka go nie zepsuła.
4. **Widok pojedynczej pracownicy** (zoom) — warstwy tylko dla niej.
5. **Legenda** — składanie, zapamiętanie stanu po odświeżeniu, trzy przełączniki
   działające dwukierunkowo z przyciskami toolbara.
6. **Kafle** — wizyta 30-, 60- i 120-minutowa pokazują odpowiednio compact,
   medium i full; ikony ostrzegawcze widoczne w każdej.
7. **Telefon** (390 px) — legenda domyślnie zwinięta, toolbar mobilny sprawny,
   arkusz akcji kompletny.
8. **Regresja funkcji z 2026-08-29** — badge ❗ na wydarzeniu Apple nadal
   klikalny, kłódka nadal pokazuje tooltip, zaznaczanie godzin pod wydarzeniem
   Apple nadal działa.
9. **Każdy przycisk toolbara** kliknięty raz, z potwierdzeniem, że robi to samo
   co przed zmianą.

## Kolejność wdrożenia

1. `calendarLayers.ts` + testy.
2. `cardDensity.ts` + testy.
3. `calendar.css` — skórka siatki i custom properties.
4. `AppointmentCard` — gęstość i kolory.
5. `CalendarLegend` + wpięcie w `CalendarView` (stan `showWorkingHours`, nowa
   warstwa, import CSS, klasa kontenera).
6. Toolbar — grupowanie i kolory.
7. Weryfikacja w przeglądarce, potem `./deploy.sh frontend`.
