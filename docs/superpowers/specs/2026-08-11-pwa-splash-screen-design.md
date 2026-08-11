# Ekran ładowania PWA (splash screen) — projekt

Data: 2026-08-11
Zakres: `cosmo-app/apps/web`

## Problem

Zainstalowana aplikacja (PWA) startuje przez biały ekran:

- **Android/Chrome** — system generuje splash z `manifest.json`: ikona 512 na tle `background_color`, dziś `#ffffff`. Działa, ale jest generyczny i biały.
- **iOS (dodane do ekranu głównego)** — brak `apple-touch-startup-image`, więc iOS pokazuje biały ekran do czasu wyrenderowania strony.
- **Po sparsowaniu HTML** — `index.html` zawiera pusty `<div id="root">`, więc do momentu wykonania JS użytkownik widzi biel. Przy pierwszym uruchomieniu (zanim Service Worker cokolwiek zacache'uje) to zauważalne opóźnienie.

## Cel

Ciągły, markowy ekran ładowania od momentu tapnięcia ikony do wyrenderowania aplikacji — bez białych błysków, wyłącznie w zainstalowanej aplikacji.

## Decyzje

| Decyzja | Wybór | Uzasadnienie |
|---|---|---|
| Kiedy pokazywać | Tylko tryb `standalone`, przy każdym starcie | Efekt natywnej aplikacji; strona publiczna w przeglądarce nie traci na LCP/SEO |
| Wygląd | Ciemna butelkowa zieleń `#1A3828` + monogram | Zgodne z `theme_color` (pasek statusu już jest ciemnozielony); paleta premium |
| Obrazki startowe iOS | Tak, generowane | Jedyny sposób na czysty start na iPhonie |

## Warstwy startu

Start aplikacji przechodzi przez trzy etapy; każdy musi mieć to samo zielone tło, żeby przejście było niewidoczne.

| Etap | Co rysuje system/przeglądarka | Nasze działanie |
|---|---|---|
| A. Splash systemowy | Android: ikona + `background_color`. iOS: `apple-touch-startup-image` albo biel | `background_color` → `#1A3828`; generujemy PNG-i dla iOS |
| B. Parsowanie HTML → start JS | pusty `#root` = biel | splash wbudowany w `index.html` (inline SVG + inline CSS) |
| C. React zamontowany | aplikacja | splash gaśnie (fade-out) i znika z DOM |

## Splash w HTML

Markup umieszczony w `index.html` bezpośrednio przed `<div id="root">`, style w inline'owym `<style>` w `<head>`. **Zero zewnętrznych zasobów** — splash rysuje się w pierwszej klatce, przed pobraniem jakiegokolwiek chunku JS.

Zawartość:

- **Monogram** — inline SVG o kształcie z `public/favicon.svg` (litera „B" + listek), przekolorowany na ciemne tło: litera `#F4F9F5`, listek `#C4965A`. Wejście: scale-in + fade-in.
- **`BeskidStudio`** — `'Playfair Display', Georgia, serif`, kolor `#F4F9F5`. Playfair ładuje się asynchronicznie, więc fallback musi być godny — Georgia jest wizualnie bliska.
- **`by Wiktoria Ćwik`** — `'DM Sans', sans-serif`, kolor `#5A7A62` (mink).
- **Pasek postępu** — czysta animacja CSS w kolorze `#C4965A`, **nie odzwierciedla realnego postępu**: 0→90 % w ~1,4 s (ease-out), dobicie do 100 % w momencie chowania.
- `@media (prefers-reduced-motion: reduce)` — bez pulsowania i przesuwania; zostaje tło, logo i sam fade.

Warunek widoczności:

```css
#app-splash { display: none; }
@media (display-mode: standalone) { #app-splash { display: flex; } }
html.is-standalone #app-splash { display: flex; }
```

Klasę `is-standalone` ustawia mikro-skrypt inline sprawdzający `navigator.standalone` — starsze wersje iOS nie wspierają media query `display-mode`.

Pozycjonowanie: `position: fixed; inset: 0; z-index: 9999;` z uwzględnieniem `env(safe-area-inset-*)`.

## Znikanie

Moduł `src/splash.ts` eksportuje `hideSplash()`, wołane z `main.tsx` po zamontowaniu roota (w `requestAnimationFrame`).

- **Minimalny czas widoczności: 700 ms** — bez tego na szybkim urządzeniu splash mignąłby na ~80 ms i wyglądał jak glitch.
- Fade-out 400 ms, następnie `remove()` z DOM.
- **Bezpiecznik 6 s** — niezależny `setTimeout` ustawiany przy starcie; splash znika nawet jeśli aplikacja wywali się przy montowaniu, żeby nie zablokować ekranu na stałe.
- Funkcja jest idempotentna (bezpiecznik i normalna ścieżka mogą się wyścigować).

Kryterium „gotowe" = **zamontowany root**, nie „dane pobrane". Czekanie na odpowiedzi API wydłużyłoby splash nieprzewidywalnie, a w trybie offline zawiesiłoby go do bezpiecznika. Stan ładowania danych obsługują szkielety w poszczególnych widokach.

## Obrazki startowe iOS

Skrypt `scripts/generate-splash-screens.mjs` (`sharp`, obecny już w monorepo) renderuje ten sam motyw — tło `#1A3828`, wyśrodkowany monogram, podpis — do portretowych PNG w `public/splash/`.

Rozmiary (portret; manifest wymusza `orientation: portrait`):

| Urządzenie | Piksele |
|---|---|
| iPhone SE (1. gen) | 640×1136 |
| iPhone 8 / SE 2–3 | 750×1334 |
| iPhone 8 Plus | 1242×2208 |
| iPhone XR / 11 | 828×1792 |
| iPhone X / XS / 11 Pro | 1125×2436 |
| iPhone XS Max / 11 Pro Max | 1242×2688 |
| iPhone 12 / 13 / 14 | 1170×2532 |
| iPhone 12 / 13 Pro Max | 1284×2778 |
| iPhone 14 / 15 Pro | 1179×2556 |
| iPhone 14 / 15 Pro Max | 1290×2796 |
| iPad 9.7" | 1536×2048 |
| iPad 10.5" | 1668×2224 |
| iPad 11" | 1668×2388 |
| iPad Pro 12.9" | 2048×2732 |

Skrypt uruchamiany **ręcznie** (`node scripts/generate-splash-screens.mjs`), wynik commitowany — bez narzutu na każdy build. Do `index.html` dochodzi po jednym `<link rel="apple-touch-startup-image" media="...">` na rozmiar, z media query opartym na `device-width`, `device-height` i `-webkit-device-pixel-ratio`.

Pliki **nie** trafiają do precache Service Workera: iOS pobiera je przy instalacji, a `globPatterns` w `vite.config.ts` jest świadomie odchudzony, żeby pierwsza wizyta nie ciągnęła megabajtów.

## Zmieniane i dodawane pliki

```
apps/web/index.html                            ~ markup splashu, style, mikro-skrypt, linki iOS
apps/web/src/splash.ts                         + hideSplash()
apps/web/src/main.tsx                          ~ wywołanie hideSplash po montażu roota
apps/web/public/manifest.json                  ~ background_color: #ffffff → #1A3828
apps/web/scripts/generate-splash-screens.mjs   + generator PNG (sharp)
apps/web/public/splash/*.png                   + 14 plików
```

## Wpływ na strony SEO

`scripts/generate-seo-pages.mjs` używa `dist/index.html` jako szablonu, więc markup splashu trafi do wszystkich wygenerowanych stron statycznych. Jest to nieszkodliwe: splash ma `display: none` poza trybem standalone, nie pobiera żadnych zasobów i nie zawiera treści indeksowalnej ponad nazwę salonu, która i tak występuje na stronie.

## Weryfikacja

1. `pnpm build && pnpm preview` w `apps/web`.
2. DevTools → Rendering → emulacja `display-mode: standalone`: splash widoczny, gaśnie po starcie i **znika z DOM**.
3. Bez emulacji: `#app-splash` niewidoczny; brak wpływu na render strony publicznej.
4. Network throttling „Slow 3G": splash utrzymuje się przez cały czas ładowania, bez migotania.
5. DevTools → Application → Manifest: `background_color` = `#1A3828`.
6. Bezpiecznik: tymczasowy `throw` w `main.tsx` → splash znika po 6 s.
7. `pnpm lint` i `pnpm build` bez błędów.
8. Test na urządzeniu po `./deploy.sh frontend` — Android (instalacja z Chrome) i iOS (Dodaj do ekranu głównego).

## Świadomie poza zakresem

- Ekran powitalny / onboarding przy pierwszym uruchomieniu (to inna funkcja niż splash).
- Realny pasek postępu odzwierciedlający pobieranie zasobów.
- Wariant splashu w orientacji poziomej (manifest wymusza portret).
- Splash dla wersji przeglądarkowej.
