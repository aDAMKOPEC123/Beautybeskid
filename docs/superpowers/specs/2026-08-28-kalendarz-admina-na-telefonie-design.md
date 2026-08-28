# Kalendarz wizyt admina na telefonie

Data: 2026-08-28

## Cel

Właścicielka salonu pracuje z panelem admina na telefonie — otwiera go między
zabiegami, jedną ręką. Kalendarz wizyt nigdy nie był pod to projektowany:
w ośmiu z dziesięciu plików modułu nie ma żadnej klasy responsywnej. Audyt
(`.superpowers/audyt-mobile-kalendarz.md`) wykazał sześć rzeczy, których na
telefonie zrobić się nie da, i kilkanaście uciążliwych.

Ta zmiana naprawia blokery i wygładza resztę. Dotyczy **wyłącznie warstwy
prezentacji** — logika dostępności terminów, blokad godzin i godzin pracy
pozostaje nietknięta, podobnie jak cały backend.

## Podejście: jedna flaga, nie drugi kalendarz

Sterujemy zachowaniem przez jeden hook `useIsMobile` (próg 768 px), który
przełącza cztery rzeczy: widok domyślny, skład paska narzędzi, formę menu
godziny i zachowanie paneli bocznych.

Odrzucone: osobny komponent kalendarza mobilnego. Blokery to punktowe defekty
we współdzielonym kodzie — nowy komponent by ich nie naprawił, a zduplikował
logikę godzin pracy, blokad i wizyt, którą właśnie zweryfikowaliśmy.

W repo istnieją dziś trzy niespójne sposoby wykrywania małego ekranu:
`window.matchMedia('(max-width: 767px)')` w `Navbar.tsx:85` (reaktywne),
`window.innerWidth < 768` w `MarketingKalendar.tsx:18` (liczone raz, nie
reaguje na obrót telefonu) oraz klasy Tailwinda. Nowy hook ujednolica to dla
kalendarza: nasłuchuje `matchMedia`, więc obrót ekranu przełącza widok.
`MarketingKalendar` zostaje nietknięty — to osobny zakres.

## Widok domyślny i siatka

**Na telefonie kalendarz otwiera się na liście tygodnia** (`listWeek`).
Wizyty jedna pod drugą, z godziną, klientką i usługą — bez ściskania kolumn.
Wzorzec sprawdzony w `MarketingKalendar.tsx:100`.

**Siatka godzin pokazuje jedną pracownicę naraz.** Zamiast
`resourceTimeGridDay` z kolumnami wszystkich osób, na telefonie używamy
`timeGridDay` przefiltrowanego do wybranej pracownicy, z rzędem imion u góry
do przełączania. Pełna szerokość ekranu na jedną kolumnę oznacza, że da się
trafić palcem w godzinę — a to warunek działania blokad i godzin pracy.

Wybrana pracownica trzyma się w stanie komponentu, więc przechodzenie między
dniami jej nie resetuje. Gdy pracownic nie ma, siatka zachowuje się jak dziś.

Mechanizm już istnieje: `zoomedEmployeeId` i `zoomToEmployee` obsługują
dokładnie ten tryb na komputerze (klik w nazwisko w nagłówku kolumny).
Na telefonie ustawiamy go domyślnie i dokładamy widoczny przełącznik.

## Pasek narzędzi

Dziś trzynaście przycisków zawijających się w cztery rzędy zjada jedną trzecią
wysokości kalendarza. Na telefonie zostają cztery: strzałka wstecz, „Dziś",
strzałka naprzód i przełącznik Lista/Siatka. Reszta — dodawanie wizyty,
klientka z zewnątrz, Happy Hours, ustawienia kalendarza Apple, przełączniki
warstw — chowa się pod jeden przycisk z trzema kropkami, otwierający arkusz
od dołu z tymi samymi akcjami. Na komputerze pasek zostaje bez zmian.

## Menu godziny jako arkusz

Menu po kliknięciu godziny jest dziś popoverem pozycjonowanym względem punktu
kliknięcia, z rezerwą 160 px do dolnej krawędzi. Menu ma pięć pozycji i
mierzy 222–258 px, więc na telefonie ostatnie pozycje — „Zablokuj godziny"
i „Dodaj godziny pracy" — wychodzą poza ekran i są nieklikalne.

Na telefonie zastępujemy je arkuszem wysuwanym od dołu: pełna szerokość,
pozycje wysokości 48 px, uchwyt u góry, zamykanie tapnięciem w tło. Znika
całe wyliczanie, czy menu się zmieści. Popover blokady godzin (otwierany
kliknięciem w blokadę) dostaje to samo traktowanie z tego samego powodu.

Na komputerze oba zostają popoverami, bez zmian.

## Panele boczne

`ClientDrawer` (karta klientki) i `HappyHourPanel` wysuwają się z prawej,
odsuwając kalendarz o `mr-80` bez prefiksu `md:` — na telefonie zostaje z
kalendarza pasek około 40 px, a panel Happy Hours wymaga jednoczesnego
klikania w kalendarz, co czyni go bezużytecznym.

Na telefonie oba zajmują pełny ekran, z nagłówkiem i przyciskiem „Zamknij"
o wysokości 44 px zamiast krzyżyka 24×20 px. Kalendarz nie jest wtedy
odsuwany — margines dostaje prefiks `md:`.

Naprawiamy przy okazji nakładanie warstw: `ClientDrawer` ma dziś `z-40`, a
jego tło `z-30`, przez co panel przykrywa własne tło i nie da się go zamknąć
tapnięciem obok.

## Okna modalne

Globalna reguła w `index.css:276-281` zamienia na telefonie każde okno w
panelu admina w arkusz dolny, ustawiając `max-height: calc(100dvh - 72px)` —
ale bez `overflow-y`. Przy dłuższej treści (lista pracownic w oknie blokad
albo godzin pracy) przycisk zapisu ląduje pod krawędzią ekranu i nie da się
do niego dojechać. Dodanie `overflow-y: auto` w tej jednej regule naprawia
pięć okien naraz.

Wszystkie przyciski zamykania i akcje w oknach kalendarza dochodzą do 44 px
wysokości.

## Widok listy wizyt

W `Appointments.tsx` przycisk edycji godziny jest ukryty pod
`opacity-0 group-hover:opacity-100` — na dotyku nie istnieje, bo nie ma
najechania. Na telefonie pokazujemy go na stałe.

Prawa kolumna wiersza ma `shrink-0` bez zawijania, co daje szerokość około
386 px na ekranie 360 px i wymusza przewijanie poziome całej strony. Dostaje
zawijanie.

## Czego ta zmiana nie robi

- nie dotyka backendu ani logiki dostępności, blokad i godzin pracy,
- nie tworzy osobnego komponentu kalendarza mobilnego,
- nie zmienia zachowania na komputerze — każda zmiana jest albo pod progiem
  `md`, albo warunkowana hookiem,
- nie rusza `MarketingKalendar.tsx` ani innych stron panelu poza kalendarzem
  wizyt i listą wizyt.

## Pliki

**Nowe**
- `apps/web/src/hooks/useIsMobile.ts` — reaktywne wykrywanie małego ekranu
- `apps/web/src/components/calendar/MobileSlotSheet.tsx` — arkusz akcji dla
  klikniętej godziny oraz dla blokady

**Modyfikowane**
- `apps/web/src/components/calendar/CalendarView.tsx` — widok domyślny, siatka
  jednej pracownicy z przełącznikiem, skrócony pasek z arkuszem akcji, menu i
  popover jako arkusze, marginesy paneli pod `md:`
- `apps/web/src/components/calendar/ClientDrawer.tsx` — pełny ekran na
  telefonie, poprawiona warstwa, przycisk zamykania
- `apps/web/src/components/calendar/HappyHourPanel.tsx` — pełny ekran na
  telefonie, przycisk zamykania
- `apps/web/src/pages/admin/Appointments.tsx` — widoczny przycisk edycji na
  dotyku, zawijanie prawej kolumny
- `apps/web/src/index.css` — przewijanie arkuszy dolnych

## Weryfikacja

Zmiany są czysto wizualne i układowe, więc testy jednostkowe nic tu nie
udowodnią — nie piszemy ich na siłę. Weryfikacja to `pnpm build` i
`pnpm lint` plus przejście po interfejsie przy szerokości 360–430 px:

1. kalendarz otwiera się na liście, pasek ma cztery przyciski,
2. przełącznik Siatka pokazuje jedną pracownicę na pełną szerokość, imiona
   przełączają osobę, wybór przeżywa zmianę dnia,
3. kliknięcie godziny otwiera arkusz od dołu z pięcioma pozycjami, wszystkie
   widoczne i klikalne,
4. „Zablokuj godziny" i „Dodaj godziny pracy" otwierają się i dają się zapisać
   — przycisk zapisu jest osiągalny przy rozwiniętej liście pracownic,
5. kliknięcie blokady otwiera arkusz z jej danymi i usuwaniem,
6. karta klientki i panel Happy Hours zajmują pełny ekran i zamykają się
   tapnięciem w tło oraz przyciskiem,
7. w widoku listy przycisk edycji godziny jest widoczny bez najeżdżania,
   a strona nie przewija się w poziomie,
8. na komputerze wszystko wygląda i działa jak przed zmianą.
