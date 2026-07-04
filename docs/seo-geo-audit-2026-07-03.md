# Audyt SEO, Local SEO i GEO — BeskidStudio

Data audytu: 2026-07-03  
Domena: https://kosmetologwiktoriacwik.pl  
Zakres: kod aplikacji, produkcyjny HTML i nagłówki HTTP, mapa witryny, robots.txt, dane strukturalne, Lighthouse mobile/desktop, treści, SEO lokalne oraz widoczność w systemach odpowiedzi AI.

## Podsumowanie zarządcze

**Ocena ogólna: 68/100.** Fundament techniczny jest solidny, ale strona nie wykorzystuje jeszcze swojego potencjału. Nie ma krytycznej blokady indeksowania. Największe bariery to:

1. **słaba wydajność mobilna** — Lighthouse Performance 58/100, FCP 4,9 s i LCP 6,3 s;
2. **za mało wartościowej treści w HTML bez JavaScriptu** — większość głównych i lokalnych landingów udostępnia botom tylko około 47–55 słów;
3. **niski autorytet tematyczny i encyjny** — jeden artykuł, brak widocznej biografii autora przy artykule, brak źródeł i niewiele zewnętrznych potwierdzeń marki;
4. **kanibalizacja oraz thin content** — landing `/laminacja-brwi-limanowa` konkuruje z `/uslugi/laminacja-brwi`, a `/uslugi/inne` i część usług są zbyt ogólne lub zbyt krótkie;
5. **brak potwierdzonej indeksacji** — publiczne wyszukiwanie `site:kosmetologwiktoriacwik.pl` nie zwróciło strony w badanym silniku. To sygnał alarmowy, ale ostateczną diagnozę trzeba zrobić w Google Search Console.

| Obszar | Ocena | Wniosek |
|---|---:|---|
| Crawl/indexowanie | 84/100 | Statusy, 404, HTTPS, canonicale i noindex są dobrze wdrożone |
| On-page SEO | 74/100 | Dobre tytuły i H1, lecz część treści jest zależna od JS |
| Dane strukturalne | 82/100 | Bogate JSON-LD, potrzebne dopracowanie encji autora i obrazów |
| Local SEO | 66/100 | Spójny NAP i lokalne landingi, ale słabe potwierdzenia zewnętrzne |
| Treść i E-E-A-T | 48/100 | Jeden dobry artykuł nie buduje jeszcze klastra ani autorytetu |
| Wydajność/mobile | 58/100 | Główna słabość techniczna |
| GEO / odpowiedzi AI | 70/100 | Boty i llms.txt są poprawne, lecz treść nie jest dostatecznie cytowalna |

## Wyniki testów produkcyjnych

### Lighthouse

| Profil | Performance | SEO | Accessibility | Best Practices | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mobile | **58** | **100** | 97 | 100 | 4,9 s | **6,3 s** | 310 ms | 0 |
| Desktop | 95 | **100** | 97 | 100 | 0,7 s | 1,5 s | 40 ms | 0,018 |

To pomiar laboratoryjny, nie dane terenowe CrUX. Docelowe progi Core Web Vitals to LCP ≤ 2,5 s, INP ≤ 200 ms i CLS ≤ 0,1 na 75. percentylu odsłon. Źródło: [Web Vitals](https://web.dev/articles/vitals).

Najważniejsze przyczyny słabego wyniku mobile:

- 694 KB transferu i 38 żądań na pierwszym wejściu;
- 350 KB skryptów, w tym ok. 111 KB niewykorzystanego JavaScriptu;
- GTM: ok. 117 KB transferu i ok. 72 KB niewykorzystanego kodu;
- fonty: ok. 166 KB;
- blokujący CSS: ok. 23 KB;
- serwer działa po HTTP/1.1 zamiast HTTP/2/3;
- cookie banner stał się elementem LCP w teście mobilnym;
- jednoczesne pobieranie statycznego preloada hero i dynamicznego obrazu hero;
- obraz hero 1251×1080 jest większy niż wymagany rozmiar wyświetlania;
- główny dokument ma `Cache-Control: no-store`, co wyłącza bfcache.

### Statusy i indeksowalność

| Test | Wynik |
|---|---|
| HTTP → HTTPS | 301, poprawnie |
| `www` → bez `www` | 301, poprawnie |
| nieistniejący URL | 404 + `X-Robots-Tag: noindex`, poprawnie |
| prywatne trasy `/user`, `/admin`, `/auth`, `/employee`, `/akademia`, `/rezerwacja` | `X-Robots-Tag: noindex, nofollow, noarchive`, poprawnie |
| nieistniejący slug usługi/blogu | prawdziwe 404, poprawnie |
| stare i duplikujące slugi | 301 w Nginx, poprawnie |
| trailing slash | normalizowany do wariantu bez ukośnika, poprawnie |
| sitemap.xml | 200, prawidłowy XML, 24 URL-e |
| robots.txt | 200, dostęp do treści dozwolony, `/api/` zablokowane |
| canonical | unikalny i zgodny z URL na wszystkich URL-ach z sitemap |

## Pełna lista kontrolna

### 1. Crawl, renderowanie i indeksowanie

- **PASS:** wszystkie URL-e z sitemap zwracają 200.
- **PASS:** błędne URL-e zwracają prawdziwe 404, nie soft-404.
- **PASS:** prywatna część aplikacji jest wyłączona z indeksu nagłówkiem HTTP.
- **PASS:** przekierowania HTTP, `www`, trailing slash i stare slugi są trwałymi 301.
- **PASS:** robots.txt wskazuje sitemap i nie blokuje publicznej treści.
- **PASS:** sitemap zawiera aktywne usługi i opublikowane artykuły oraz `lastmod` dla treści dynamicznych.
- **UWAGA:** główne i lokalne strony mają w surowym HTML tylko ok. 47–55 słów. Google potrafi renderować JavaScript, ale renderowanie jest osobnym etapem, a inne boty nie muszą wykonywać aplikacji React. Google opisuje ten model w [JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- **UWAGA:** artykuł jest obecny w HTML bez JS, ale cała treść zostaje spłaszczona do jednego `<p>`; nagłówki H2/H3 i linki wewnętrzne nie są zachowane w prerenderze.
- **FAIL/DO WERYFIKACJI:** publiczne wyszukiwanie domeny nie pokazało jej wyników. Natychmiast sprawdzić raport „Strony” i Inspekcję URL w GSC.

Rekomendacja: generator powinien tworzyć pełny semantyczny HTML każdej strony, a nie krótką atrapę usuwaną po starcie Reacta. Najlepsze rozwiązanie to SSR/SSG lub prawdziwy prerender komponentów. Minimum: wyrenderować w `generate-seo-pages.mjs` pełne sekcje landingów, listę usług, FAQ, nagłówki artykułu i linkowanie kontekstowe.

### 2. Tytuły, meta description, canonical i robots

- **PASS:** każdy URL w sitemap ma tytuł, description, canonical i robots.
- **PASS:** tytuły są unikalne i zawierają usługę/lokalizację.
- **PASS:** canonicale są bez parametrów i wskazują wersję HTTPS bez `www`.
- **PASS:** niedostępna podologia i wrastające paznokcie mają `noindex` i nie występują w sitemap.
- **PASS:** pojedynczy język polski nie wymaga `hreflang`.
- **UWAGA:** część tytułów usług jest mało naturalna lub mało precyzyjna, np. „INNE Limanowa” i „Farbka Limanowa”.
- **UWAGA:** statyczny generator nie ustawia dedykowanego `og:image` ani tagów Twitter/X dla usług i artykułów. Boty social media zwykle nie wykonują Reacta, więc widzą ogólny obraz hero albo brak karty X.
- **UWAGA:** zadeklarowane w React `og:image:width=1200` i `height=630` nie odpowiadają domyślnemu plikowi 1400×747.

### 3. Nagłówki, semantyka i dostępność

- **PASS:** kluczowe strony mają pojedynczy H1 w statycznym HTML.
- **PASS:** obrazy na stronie głównej przeszły automatyczny test `alt`.
- **PASS:** dokument ma `lang="pl"`, viewport i poprawne kodowanie UTF-8.
- **PASS:** Lighthouse Accessibility 97/100.
- **FAIL:** kontrast kilku tekstów jest za niski, zwłaszcza `#C4965A` na jasnym tle, opisy w kalendarzu i skróty dni tygodnia. Wykryte współczynniki to ok. 2,49–4,21 przy wymaganych 4,5:1.
- **UWAGA:** tytuł artykułu ma H1, lecz po wejściu bez JS brakuje semantycznych H2/H3 treści.

### 4. Dane strukturalne

- **PASS:** JSON-LD jest poprawnym JSON-em.
- **PASS:** obecne są `BeautySalon`, `PostalAddress`, `GeoCoordinates`, godziny otwarcia, telefon, adres, `sameAs`, `Service`, `Offer`, `BreadcrumbList`, `FAQPage`, `BlogPosting`, `Person` i `WebPage`.
- **PASS:** usługi mają cenę, walutę PLN, dostępność i relację do salonu.
- **PASS:** artykuł ma `headline`, `datePublished`, `dateModified`, autora, wydawcę i obraz.
- **PASS:** brak samodzielnie wystawionego `AggregateRating` dla własnego salonu — to bezpieczne względem wytycznych Google.
- **UWAGA:** statyczny `BeautySalon` powinien mieć `priceRange`; wersja React już go ma, ale nie każdy bot zobaczy tę wersję.
- **UWAGA:** autor artykułu ma tylko `name`. Dodać `@id`, `url: /o-nas`, `sameAs`, zdjęcie, kwalifikacje i spójną relację z encją salonu. Google rekomenduje `author.url` do jednoznacznej identyfikacji autora: [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
- **UWAGA:** `Person` na `/o-nas` nie ma `@id`, URL, zdjęcia, `sameAs`, `knowsAbout` ani informacji o kwalifikacjach.
- **UWAGA:** warto udostępnić obrazy encji w proporcjach 1:1, 4:3 i 16:9. Google rekomenduje te warianty dla danych strukturalnych.
- **UWAGA:** `alternateName` w lokalnym schema zawiera nienaturalny wariant „Wiktoria Ćwik BeskidStudio By Wiktoria Ćwik”. Usunąć.
- **PASS:** `BeautySalon` jest właściwym, konkretnym podtypem LocalBusiness. Zgodność pól można utrzymywać według [dokumentacji LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business).

### 5. Architektura informacji i linkowanie

- **PASS:** nawigacja i footer prowadzą do najważniejszych sekcji.
- **PASS:** lokalne landingi linkują do usług, kontaktu i rezerwacji.
- **PASS:** breadcrumb schema jest obecne na usługach i artykule.
- **FAIL:** `/laminacja-brwi-limanowa` oraz `/uslugi/laminacja-brwi` celują w tę samą frazę i intencję. To kanibalizacja.
- **UWAGA:** artykuł nie ma kontekstowych linków do źródeł ani widocznego klastra artykułów powiązanych.
- **UWAGA:** strony usług powinny linkować do 2–4 poradników, metamorfoz i FAQ dotyczących konkretnego zabiegu; artykuły powinny linkować do odpowiadającej usługi i rezerwacji.
- **UWAGA:** lokalne landingi są obecnie głównie wariantami lokalizacja × usługa. Trzeba pilnować, aby różniły się realną treścią i dowodami lokalnymi, a nie tylko nazwą miejscowości.

Rekomendacja dla laminacji brwi: pozostawić jeden główny URL. Najczyściej zachować `/uslugi/laminacja-brwi` jako stronę transakcyjną, rozbudować ją pod frazę „laminacja brwi Limanowa”, a `/laminacja-brwi-limanowa` przekierować 301. Alternatywnie lokalny landing musi obsługiwać odrębną intencję i linkować do cennika zabiegu bez powielania treści.

### 6. Treść i E-E-A-T

- **PLUS:** artykuł o laminacji ma ok. 950 słów w surowym HTML i odpowiada na realne pytania użytkowników.
- **PLUS:** dostępność usług, ceny i terminy są spięte z aktualnymi danymi systemu.
- **FAIL:** blog ma tylko jeden opublikowany artykuł. To za mało, by zbudować topical authority.
- **FAIL:** przy artykule nie ma widocznej linijki „Autor: Wiktoria Ćwik, dyplomowany kosmetolog” z linkiem do profilu.
- **FAIL:** brak bibliografii/źródeł przy treściach o przeciwwskazaniach i pielęgnacji.
- **UWAGA:** data aktualizacji jest w schema, ale nie jest wyraźnie pokazana użytkownikowi.
- **UWAGA:** deklaracje „500+ klientek” i „5+ lat doświadczenia” powinny mieć wewnętrzne potwierdzenie i być aktualizowane, a ocena Google powinna zawsze pochodzić z API.
- **UWAGA:** plik słów kluczowych zawiera wiele usług, których aktualna oferta nie obejmuje. Nie tworzyć landingów dla mezoterapii, kwasu hialuronowego, depilacji laserowej, manicure itp., dopóki usługi nie są faktycznie dostępne.

Rekomendowany pierwszy klaster treści:

1. Laminacja brwi: trwałość, pielęgnacja 24/48 h, przeciwwskazania, porównanie z henną/farbką, dla kogo.
2. Lifting rzęs: trwałość, przygotowanie, pielęgnacja, laminacja vs przedłużanie.
3. Henna/farbka/regulacja: różnice, dobór koloru, częstotliwość, bezpieczeństwo.
4. Konsultacja kosmetologiczna: przebieg, przygotowanie, efekty, plan pielęgnacji.
5. Lokalne poradniki: dojazd/parking, pierwsza wizyta, cennik i wybór zabiegu w Limanowej.

Każdy artykuł: odpowiedź w pierwszych 2–3 zdaniach, spis treści, H2 w formie pytań, źródła, autor i data aktualizacji, krótkie FAQ, link do usługi, metamorfozy i rezerwacji.

### 7. Local SEO

- **PASS:** NAP jest spójny w kodzie i schema: BeskidStudio By Wiktoria Ćwik, Mordarka 505, 34-600 Mordarka, +48 532 128 227.
- **PASS:** adres, współrzędne, godziny, obszar obsługi, mapa i social media są dostępne.
- **PASS:** lokalne frazy Limanowa/Mordarka są obecne w title, H1, opisach i schema.
- **UWAGA:** link do mapy jest zapytaniem tekstowym, nie trwałym URL-em do konkretnego Place ID.
- **NIEZWERYFIKOWANE:** własność i kompletność Google Business Profile, główna/dodatkowe kategorie, opis, usługi, produkty, atrybuty, zdjęcia, Q&A, posty i link rezerwacji.
- **NIEZWERYFIKOWANE:** zgodność NAP w Facebooku, Instagramie, katalogach lokalnych i mapach Apple/Bing.
- **NIEZWERYFIKOWANE:** liczba, świeżość i tempo pozyskiwania opinii Google oraz odpowiedzi właściciela.

Priorytet lokalny:

1. zweryfikować i uzupełnić GBP;
2. dodać link strony i rezerwacji z UTM;
3. publikować nowe zdjęcia i posty;
4. pozyskiwać regularne, autentyczne opinie opisujące konkretną usługę;
5. odpowiadać na każdą opinię;
6. zbudować 10–20 zgodnych cytowań NAP w wartościowych katalogach lokalnych/branżowych;
7. zdobyć linki lokalne: partnerzy, wydarzenia, lokalne media, organizacje i dostawcy.

### 8. GEO — widoczność w odpowiedziach AI

- **PASS:** `robots.txt` jawnie zezwala `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot` i `GoogleOther`.
- **PASS:** `llms.txt` jasno opisuje firmę, NAP, właścicielkę, ofertę, brak aktywnej podologii i najważniejsze URL-e.
- **PASS:** treść ma jednoznaczną encję firmy, osobę, lokalizację i aktualną listę usług.
- **PASS:** OpenAI wskazuje, że `OAI-SearchBot` odpowiada za możliwość pojawiania się witryn w odpowiedziach wyszukiwania ChatGPT; konfiguracja strony jest zgodna z tą rekomendacją: [OpenAI crawlers](https://developers.openai.com/api/docs/bots).
- **FAIL:** główne landingi mają za mało treści w HTML bez JS, więc boty bez renderowania widzą tylko skrót.
- **FAIL:** treści prawie nie cytują źródeł zewnętrznych i nie pokazują autora/kwalifikacji w warstwie widocznej.
- **FAIL:** marka ma mało niezależnych wzmianek w publicznym indeksie; odpowiedzi AI mają słabe zewnętrzne potwierdzenie encji.
- **UWAGA:** `llms.txt` pomaga porządkować informacje, ale nie zastępuje indeksowalnego HTML, linków, opinii ani cytowań.
- **UWAGA:** FAQ jest dobre dla ekstrakcji odpowiedzi, lecz powinno być w pełni obecne także w prerenderowanym HTML.

Format treści przyjazny GEO:

- krótkie definicje i odpowiedzi na początku sekcji;
- konkretne liczby z kontekstem i datą aktualizacji;
- tabele „zabieg / czas / cena / trwałość / dla kogo”;
- jednoznaczne wskazanie autora i kwalifikacji;
- cytowane, wiarygodne źródła przy bezpieczeństwie i przeciwwskazaniach;
- spójne fakty o firmie na stronie, w schema, GBP i profilach społecznościowych;
- osobne, cytowalne sekcje o dojeździe, parkingu, obszarze obsługi i procesie wizyty.

### 9. Obrazy i social preview

- **PASS:** WebP, lazy loading i wymiary są stosowane w wielu komponentach.
- **PASS:** obrazy publiczne są dostępne i cache'owane.
- **FAIL:** brakuje dedykowanego, prawdziwego pliku OG 1200×630.
- **FAIL:** generator HTML nie ustawia obrazu artykułu/usługi w surowym OG.
- **UWAGA:** dla hero z CMS należy generować `srcset`/`sizes` i wariant mobilny.
- **UWAGA:** warto generować dodatkowe obrazy 1:1, 4:3 i 16:9 dla encji i artykułów.

### 10. Analityka i monitoring

- **PASS:** GA4, GTM i Consent Mode v2 są obecne.
- **RYZYKO:** jednocześnie ładowany jest bezpośredni `gtag.js` GA4 oraz GTM. Jeżeli kontener GTM także uruchamia GA4, odsłony i zdarzenia mogą być dublowane.
- **FAIL/DO WERYFIKACJI:** brak dostępu do GSC i GBP uniemożliwia ocenę kliknięć, zapytań, indeksacji i pozycji w Local Pack.
- **UWAGA:** wdrożyć RUM dla LCP/INP/CLS, ponieważ Lighthouse nie zastępuje danych realnych użytkowników.

Minimalny dashboard miesięczny:

- GSC: kliknięcia, wyświetlenia, CTR, pozycje i indeksowane URL-e;
- GBP: wyświetlenia, telefony, trasy, kliknięcia rezerwacji;
- GA4: `view_service`, `select_service`, `booking_start`, `booking_complete`, telefon, mapa, formularz;
- CWV/RUM: LCP, INP, CLS z podziałem mobile/desktop;
- widoczność AI: testowy zestaw 15 pytań w ChatGPT/Perplexity/Google AI i lista cytowanych źródeł.

### 11. Serwer i nagłówki

- **PASS:** gzip, cache immutable dla hashowanych assetów i 30-dniowy cache uploadów.
- **FAIL:** brak HTTP/2/3; Lighthouse wskazuje „Modern HTTP”.
- **UWAGA:** HTML ma `no-store`, przez co nie korzysta z bfcache. Dla publicznych, wersjonowanych stron można użyć krótkiego cache z rewalidacją zamiast `no-store`.
- **UWAGA:** brak HSTS w odpowiedzi. To głównie bezpieczeństwo, ale warto dodać po upewnieniu się, że cała domena i subdomeny działają wyłącznie po HTTPS.
- **UWAGA:** nagłówki assetów zawierają dwa wpisy `Cache-Control` (`max-age` z `expires` i jawny nagłówek). Nie psuje działania, ale można uprościć konfigurację.

## Priorytety wdrożenia

### P0 — pierwsze 7 dni

1. Podłączyć/zweryfikować Google Search Console, wysłać sitemap i ręcznie zgłosić stronę główną, usługi, lokalne landingi oraz artykuł.
2. Sprawdzić, dlaczego domena nie pojawia się w publicznym `site:`: „Crawled — currently not indexed”, duplikat, świeża domena, ręczna akcja lub brak odkrycia.
3. Przerobić prerender tak, aby pełna treść landingów, FAQ i nagłówki artykułów były obecne w HTML bez JS.
4. Naprawić mobile LCP/FCP: nie usuwać treści prerenderowanej podczas startu Reacta, ograniczyć JS i GTM, usprawnić cookie banner.
5. Rozstrzygnąć kanibalizację `/laminacja-brwi-limanowa` vs `/uslugi/laminacja-brwi`.
6. Ustawić `noindex` lub usunąć `/uslugi/inne`; rozbudować albo scalić bardzo cienkie usługi.

### P1 — 2–4 tygodnie

1. Dodać widoczną sekcję autora, kwalifikacje, datę aktualizacji i źródła do artykułów.
2. Rozbudować encję `Person` oraz `BlogPosting.author` o `@id`, URL, `sameAs`, zdjęcie i kompetencje.
3. Utworzyć dedykowane obrazy OG 1200×630 i wstawić je do statycznego HTML każdej strony.
4. Opublikować 6–10 artykułów w trzech klastrach: brwi, rzęsy, konsultacja/pielęgnacja.
5. Dodać linkowanie usługa ↔ poradnik ↔ metamorfoza ↔ rezerwacja.
6. Uzupełnić i aktywnie prowadzić Google Business Profile oraz cytowania NAP.
7. Naprawić kontrast tekstu i elementów kalendarza.

### P2 — 1–3 miesiące

1. Włączyć HTTP/2, uporządkować cache HTML i rozważyć HSTS.
2. Self-hostować/subsetować fonty i ograniczyć liczbę wag.
3. Ograniczyć vendor preload/chunki oraz uruchamiać analitykę wyłącznie przez jeden mechanizm.
4. Dodać responsive images dla dynamicznego hero i obrazów usług.
5. Zbudować lokalne linki i niezależne wzmianki o marce.
6. Wdrożyć monitoring CWV z realnych urządzeń i cykliczny test GEO.

## Co już jest zrobione bardzo dobrze

- prawdziwe 404 i ochrona przed soft-404;
- trwałe przekierowania starych/duplikujących URL-i;
- poprawne canonicale i noindex prywatnej aplikacji;
- dynamiczna sitemap i statyczne entry pages dla treści CMS;
- poprawny, rozbudowany LocalBusiness/Service/Article JSON-LD;
- spójny NAP, lokalizacja i profile społecznościowe;
- jawna obsługa botów AI i rozsądny `llms.txt`;
- prawidłowe wyłączenie niedostępnej podologii z indeksu;
- doskonały wynik technicznego audytu SEO Lighthouse: 100/100.

## Ograniczenia audytu

Bez dostępu do Google Search Console, Google Business Profile i GA4 nie da się potwierdzić liczby zaindeksowanych URL-i, ręcznych działań, realnych zapytań, CTR, pozycji w Local Pack ani rzeczywistych Core Web Vitals. Te trzy źródła powinny być kolejnym etapem audytu danych, nie powodem do odkładania wykrytych napraw technicznych.

## Aktualizacja po wdrożeniu poprawek — 2026-07-04

Zrealizowano wszystkie techniczne punkty możliwe do wykonania w repozytorium:

- pełniejszy semantyczny HTML bez JavaScriptu, zachowane H2/H3, listy, FAQ, autor i daty artykułów;
- unikalne meta, canonicale, OG/Twitter oraz właściwe obrazy dla treści dynamicznych;
- rozbudowane i spójne encje `BeautySalon`, `Person`, `BlogPosting` i `Service`;
- rozdzielona intencja lokalnego poradnika o laminacji i transakcyjnej strony usługi;
- `noindex` dla ogólnego slugu `/uslugi/inne` i wykluczenie go z sitemap;
- usunięte odwołania do starych URL-i ze strony, seedów i mapy witryny;
- analityka ładowana dopiero po zgodzie, bez dublowania bezpośredniego GA i GTM;
- odroczone cięższe moduły i obrazy nieaktywnych slajdów hero;
- poprawiony kontrast WCAG, cache publicznego HTML, HTTP/2 i HSTS.

Walidacja po zmianach:

| Test lokalnego buildu produkcyjnego | Wynik |
|---|---:|
| Lighthouse SEO | **100/100** |
| Lighthouse Accessibility | **100/100** |
| Lighthouse Performance mobile | 78/100 |
| Frontend build | PASS |
| Backend build | PASS |
| Canonical/title/description/H1 na indeksowalnych entry pages | PASS |
| JSON-LD | 118 poprawnie sparsowanych bloków, 0 błędów |
| Linki do adresów będących źródłami 301 | 0 |

Wyniku 100/100 dla pozycji, indeksacji albo GEO nie można zagwarantować kodem: zależy on również od ponownego crawlowania, jakości treści, profilu firmy Google, opinii, cytowań i konkurencji. Warstwa technicznego SEO jest jednak doprowadzona do wyniku 100/100 w Lighthouse.

### Search Console: „Strona zawiera przekierowanie”

Prawidłowe przekierowania 301 zostały zachowane dla `www`, HTTP, końcowego ukośnika oraz historycznych/duplikujących slugów. Takie adresy z definicji nie powinny być indeksowane — Google ma indeksować ich końcowe adresy docelowe. Naprawa polegała na usunięciu źródeł tych 301 z linkowania, danych i sitemap, a nie na skasowaniu potrzebnych przekierowań.

Po publikacji należy:

1. wysłać ponownie `https://kosmetologwiktoriacwik.pl/sitemap.xml`;
2. w raporcie „Strony” sprawdzić przykładowe URL-e z tej przyczyny;
3. jeżeli są to historyczne adresy przekierowane 301, pozostawić je bez żądania indeksacji;
4. przez Inspekcję URL zgłaszać wyłącznie końcowe adresy zwracające 200;
5. uruchomić „Sprawdź poprawkę” po wdrożeniu. Zniknięcie komunikatu wymaga ponownego crawlowania i może potrwać.
