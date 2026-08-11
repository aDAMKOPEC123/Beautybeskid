# Ekran ładowania PWA — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zainstalowana aplikacja (PWA) startuje przez markowy, ciemnozielony ekran ładowania zamiast białego ekranu — od tapnięcia ikony do wyrenderowania Reacta.

**Architecture:** Trzy warstwy tego samego tła `#1A3828`: splash systemowy (Android z `manifest.background_color`, iOS z `apple-touch-startup-image`), splash wbudowany w `index.html` (inline SVG + inline CSS, zero requestów, widoczny natychmiast po sparsowaniu HTML) oraz zgaszenie go z `main.tsx` po zamontowaniu Reacta. Logika czasowa mieszka w testowanym module `src/splash.ts`; niezależny bezpiecznik 6 s żyje w inline'owym skrypcie w HTML, żeby zadziałał nawet gdy chunk aplikacji się nie wczyta.

**Tech Stack:** Vite 5 + React 19 + TypeScript, `vite-plugin-pwa` (strategia `injectManifest`), Vitest (środowisko `node`, globale stubowane przez `vi.stubGlobal`), `sharp` (generator PNG, uruchamiany ręcznie przez workspace `cosmo-server`).

**Spec:** `docs/superpowers/specs/2026-08-11-pwa-splash-screen-design.md`

## Global Constraints

- Wszystkie ścieżki względem `cosmo-app/` (to jest korzeń repozytorium git). Polecenia `pnpm` uruchamiane z `apps/web/`, chyba że napisano inaczej.
- Splash widoczny **wyłącznie** w trybie standalone. W przeglądarce `#app-splash` ma `display: none` i nie może wpływać na render strony publicznej ani na LCP.
- Splash nie pobiera **żadnych** zewnętrznych zasobów: SVG inline, style inline, brak `<img>`, brak webfontów jako warunku wyświetlenia.
- Kolory (dokładne wartości z palety projektu): tło `#1A3828` (espresso), litera i tekst `#F4F9F5` (ivory), akcent/listek/pasek `#C4965A` (oak), podpis `#5A7A62` (mink).
- Typografia: nazwa `'Playfair Display', Georgia, serif`; podpis `'DM Sans', sans-serif`. Fallbacki są obowiązkowe — webfonty ładują się asynchronicznie i nie będą gotowe w chwili pokazania splashu.
- Stałe czasowe: minimalny czas widoczności **700 ms**, fade-out **400 ms**, bezpiecznik **6000 ms**. Muszą być identyczne w `src/splash.ts`, w CSS (`transition`) i w inline'owym skrypcie.
- Teksty PL z polskimi znakami: `BeskidStudio`, `by Wiktoria Ćwik`.
- `@media (prefers-reduced-motion: reduce)` wyłącza wszystkie animacje splashu.
- Nazwy testów i komentarze po polsku — zgodnie z konwencją w `src/lib/device-token.test.ts`.
- Vitest działa w środowisku `node` (`vitest.config.ts`), więc `document`, `window` i `Date` trzeba stubować przez `vi.stubGlobal`.
- Nie dodawać nowych zależności do `apps/web/package.json`.

## File Structure

| Plik | Odpowiedzialność |
|---|---|
| `apps/web/src/splash.ts` | **Nowy.** Ścieżka „normalna": ile jeszcze trzymać splash i jak go zgasić. Jedyne miejsce z logiką czasową w TS. |
| `apps/web/src/splash.test.ts` | **Nowy.** Testy jednostkowe modułu wyżej. |
| `apps/web/src/main.tsx` | **Modyfikacja.** Wywołanie `hideSplash()` po zamontowaniu roota. |
| `apps/web/index.html` | **Modyfikacja.** Markup splashu, style inline, skrypt startowy z bezpiecznikiem, linki `apple-touch-startup-image`. |
| `apps/web/public/manifest.json` | **Modyfikacja.** `background_color` → `#1A3828`. |
| `apps/web/scripts/generate-splash-screens.mjs` | **Nowy.** Generator 14 PNG dla iOS. Uruchamiany ręcznie. |
| `apps/web/public/splash/*.png` | **Nowe.** Wygenerowane obrazki startowe, commitowane do repo. |

---

### Task 1: Moduł gaszący splash (`src/splash.ts`)

Moduł powstaje **przed** markupem, żeby logikę czasową dało się przetestować w izolacji. Na tym etapie w `index.html` nie ma jeszcze elementu `#app-splash` — `hideSplash()` po prostu nic nie robi, co jest jednym z testowanych zachowań.

**Files:**
- Create: `apps/web/src/splash.ts`
- Test: `apps/web/src/splash.test.ts`
- Modify: `apps/web/src/main.tsx` (dodanie importu i wywołania po `render`)

**Interfaces:**
- Consumes: nic (pierwsze zadanie).
- Produces:
  - `export const MIN_VISIBLE_MS = 700`
  - `export const FADE_MS = 400`
  - `export function remainingVisibleTime(startedAt: number, now: number, minVisibleMs?: number): number`
  - `export function hideSplash(): void`
  - `export function resetSplashStateForTests(): void`
  - Globalny kontrakt z HTML: `window.__SPLASH_START__?: number` (znacznik czasu ustawiany w `index.html` w Zadaniu 2), element o `id="app-splash"`, klasa `is-hidden`.

- [ ] **Step 1: Napisz testy (najpierw czerwone)**

Utwórz `apps/web/src/splash.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  remainingVisibleTime,
  hideSplash,
  resetSplashStateForTests,
  MIN_VISIBLE_MS,
  FADE_MS,
} from './splash';

// Vitest działa tu w środowisku 'node', które nie zna document/window.
function createFakeSplash() {
  const classes = new Set<string>();
  return {
    removed: false,
    classList: {
      add: (name: string) => {
        classes.add(name);
      },
      contains: (name: string) => classes.has(name),
    },
    remove() {
      this.removed = true;
    },
  };
}

describe('remainingVisibleTime', () => {
  it('zwraca pełny minimalny czas, gdy splash dopiero wystartował', () => {
    expect(remainingVisibleTime(1_000, 1_000)).toBe(MIN_VISIBLE_MS);
  });

  it('zwraca resztę czasu, gdy część minimalnego okna już minęła', () => {
    expect(remainingVisibleTime(1_000, 1_200)).toBe(500);
  });

  it('zwraca zero, gdy minimalny czas już minął', () => {
    expect(remainingVisibleTime(1_000, 5_000)).toBe(0);
  });

  it('nie ufa cofniętemu zegarowi i zwraca pełny minimalny czas', () => {
    expect(remainingVisibleTime(5_000, 1_000)).toBe(MIN_VISIBLE_MS);
  });

  it('nie ufa nieliczbowemu znacznikowi startu', () => {
    expect(remainingVisibleTime(Number.NaN, 1_000)).toBe(MIN_VISIBLE_MS);
  });
});

describe('hideSplash', () => {
  let fake: ReturnType<typeof createFakeSplash> | null;

  beforeEach(() => {
    resetSplashStateForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(10_000));
    fake = createFakeSplash();
    vi.stubGlobal('document', { getElementById: () => fake });
    vi.stubGlobal('window', { __SPLASH_START__: 10_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('trzyma splash przez minimalny czas, zanim zacznie go gasić', () => {
    hideSplash();

    vi.advanceTimersByTime(MIN_VISIBLE_MS - 1);
    expect(fake!.classList.contains('is-hidden')).toBe(false);

    vi.advanceTimersByTime(1);
    expect(fake!.classList.contains('is-hidden')).toBe(true);
  });

  it('usuwa element z DOM dopiero po zakończeniu fade-outu', () => {
    hideSplash();

    vi.advanceTimersByTime(MIN_VISIBLE_MS + FADE_MS - 1);
    expect(fake!.removed).toBe(false);

    vi.advanceTimersByTime(1);
    expect(fake!.removed).toBe(true);
  });

  it('gasi natychmiast, gdy minimalny czas minął jeszcze przed startem Reacta', () => {
    vi.setSystemTime(new Date(10_000 + MIN_VISIBLE_MS + 300));

    hideSplash();
    vi.advanceTimersByTime(0);

    expect(fake!.classList.contains('is-hidden')).toBe(true);
  });

  it('jest idempotentny — drugie wywołanie nie planuje kolejnego gaszenia', () => {
    hideSplash();
    vi.advanceTimersByTime(MIN_VISIBLE_MS + FADE_MS);
    expect(fake!.removed).toBe(true);

    const second = createFakeSplash();
    fake = second;
    hideSplash();
    vi.advanceTimersByTime(MIN_VISIBLE_MS + FADE_MS);

    expect(second.removed).toBe(false);
  });

  it('nie rzuca, gdy splashu nie ma w DOM (tryb przeglądarkowy)', () => {
    vi.stubGlobal('document', { getElementById: () => null });

    expect(() => hideSplash()).not.toThrow();
  });

  it('przyjmuje brak znacznika startu i i tak gasi splash', () => {
    vi.stubGlobal('window', {});

    hideSplash();
    vi.advanceTimersByTime(MIN_VISIBLE_MS + FADE_MS);

    expect(fake!.removed).toBe(true);
  });
});
```

- [ ] **Step 2: Uruchom testy, żeby potwierdzić, że nie przechodzą**

Z katalogu `apps/web`:

```bash
pnpm vitest run src/splash.test.ts
```

Oczekiwane: FAIL — `Failed to resolve import "./splash"`.

- [ ] **Step 3: Napisz moduł**

Utwórz `apps/web/src/splash.ts`:

```ts
// filepath: apps/web/src/splash.ts
/**
 * Ekran ładowania zainstalowanej aplikacji (tryb standalone).
 *
 * Markup, style i bezpiecznik żyją w index.html — dzięki temu splash rysuje się
 * zanim pobierze się jakikolwiek chunk JS i znika nawet wtedy, gdy aplikacja się
 * nie wczyta. Tutaj jest tylko ścieżka „normalna": zgaszenie splashu po
 * zamontowaniu Reacta.
 */

declare global {
  interface Window {
    /** Znacznik czasu ustawiany w index.html w chwili parsowania dokumentu. */
    __SPLASH_START__?: number;
  }
}

/** Minimalny czas widoczności — bez niego splash mignąłby na szybkim urządzeniu. */
export const MIN_VISIBLE_MS = 700;

/** Musi być zgodne z `transition: opacity` na #app-splash w index.html. */
export const FADE_MS = 400;

const SPLASH_ID = 'app-splash';
const HIDDEN_CLASS = 'is-hidden';

/**
 * Ile jeszcze trzeba trzymać splash. Zegar startuje przy parsowaniu HTML, a nie
 * przy załadowaniu tego modułu — moduł pojawia się dopiero po pobraniu chunków.
 */
export function remainingVisibleTime(
  startedAt: number,
  now: number,
  minVisibleMs: number = MIN_VISIBLE_MS,
): number {
  const elapsed = now - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) return minVisibleMs;
  return Math.max(0, minVisibleMs - elapsed);
}

let hideRequested = false;

/** Gasi splash. Bezpieczne do wielokrotnego wywołania. */
export function hideSplash(): void {
  if (hideRequested) return;
  hideRequested = true;

  const element = document.getElementById(SPLASH_ID);
  if (!element) return;

  const startedAt =
    typeof window.__SPLASH_START__ === 'number' ? window.__SPLASH_START__ : Date.now();

  setTimeout(() => {
    element.classList.add(HIDDEN_CLASS);
    setTimeout(() => element.remove(), FADE_MS);
  }, remainingVisibleTime(startedAt, Date.now()));
}

/** Wyłącznie dla testów — zeruje strażnika idempotencji. */
export function resetSplashStateForTests(): void {
  hideRequested = false;
}
```

- [ ] **Step 4: Uruchom testy, żeby potwierdzić, że przechodzą**

```bash
pnpm vitest run src/splash.test.ts
```

Oczekiwane: PASS, 11 testów.

- [ ] **Step 5: Wepnij wywołanie w `main.tsx`**

W `apps/web/src/main.tsx` dodaj import obok pozostałych (linia 5, po `import './index.css';`):

```ts
import { hideSplash } from './splash';
```

oraz — po wywołaniu `ReactDOM.createRoot(...).render(...)`, przed blokiem `if ('serviceWorker' in navigator)` — dodaj:

```ts
// Splash gaśnie po pierwszej klatce z zamontowanym Reactem. Świadomie nie czekamy
// na dane z API: offline zawiesiłoby to do bezpiecznika, a stany ładowania
// obsługują szkielety w widokach.
requestAnimationFrame(() => hideSplash());
```

- [ ] **Step 6: Sprawdź typy i lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Oczekiwane: brak błędów. Jeśli ESLint zgłosi nieużywany eksport `resetSplashStateForTests`, zignoruj — jest używany w pliku testowym.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/splash.ts apps/web/src/splash.test.ts apps/web/src/main.tsx
git commit -m "feat(pwa): modul gaszacy ekran ladowania"
```

---

### Task 2: Splash w `index.html` + kolor tła manifestu

Po tym zadaniu funkcja **działa end-to-end** na Androidzie i w emulacji `display-mode: standalone`. iOS dostaje swoje obrazki startowe w Zadaniu 3.

**Files:**
- Modify: `apps/web/index.html` (blok `<style>` i skrypt w `<head>`; markup w `<body>` przed `<div id="root">`)
- Modify: `apps/web/public/manifest.json:12` (`background_color`)

**Interfaces:**
- Consumes: z Zadania 1 — kontrakt `id="app-splash"`, klasa `is-hidden`, `window.__SPLASH_START__`, fade 400 ms.
- Produces: element `#app-splash` w DOM oraz `window.__SPLASH_START__: number` ustawiany przy parsowaniu dokumentu. Zadanie 3 dopisze linki `apple-touch-startup-image` do tego samego `<head>`.

- [ ] **Step 1: Dodaj style splashu do `<head>`**

W `apps/web/index.html` wstaw poniższy blok bezpośrednio **po** linii z `<meta name="color-scheme" content="light" />` (linia 16), przed komentarzem `<!-- Preload LCP image for mobile -->`:

```html
    <!-- Ekran ładowania PWA. Wszystko inline: splash musi być gotowy zanim
         pobierze się jakikolwiek zewnętrzny zasób. -->
    <style>
      #app-splash {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        background: #1A3828;
        padding: env(safe-area-inset-top) env(safe-area-inset-right)
          env(safe-area-inset-bottom) env(safe-area-inset-left);
        opacity: 1;
        transition: opacity 400ms ease-out;
      }
      /* Widoczny wyłącznie w zainstalowanej aplikacji. */
      @media (display-mode: standalone) {
        #app-splash { display: flex; }
      }
      /* iOS starszy niż 16.4 nie zna media query display-mode. */
      html.is-standalone #app-splash { display: flex; }

      #app-splash.is-hidden { opacity: 0; pointer-events: none; }

      #app-splash .splash-mark {
        width: 88px;
        height: 88px;
        animation: splash-mark-in 620ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
      }
      #app-splash .splash-name {
        margin: 0;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.75rem;
        font-weight: 700;
        color: #F4F9F5;
        animation: splash-fade-in 620ms ease-out 120ms both;
      }
      #app-splash .splash-sub {
        margin: -0.85rem 0 0;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 0.75rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #5A7A62;
        animation: splash-fade-in 620ms ease-out 220ms both;
      }
      #app-splash .splash-bar {
        width: 132px;
        height: 2px;
        margin-top: 0.5rem;
        border-radius: 999px;
        background: rgba(244, 249, 245, 0.14);
        overflow: hidden;
      }
      /* Dekoracja, nie pomiar — realnego postępu ładowania nie znamy. */
      #app-splash .splash-bar i {
        display: block;
        width: 0;
        height: 100%;
        background: #C4965A;
        animation: splash-bar 1400ms cubic-bezier(0.15, 0.75, 0.25, 1) forwards;
      }
      #app-splash.is-hidden .splash-bar i {
        width: 100%;
        animation: none;
        transition: width 220ms ease-out;
      }

      @keyframes splash-mark-in {
        from { opacity: 0; transform: scale(0.88); }
        to { opacity: 1; transform: none; }
      }
      @keyframes splash-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: none; }
      }
      @keyframes splash-bar {
        from { width: 0; }
        to { width: 90%; }
      }

      @media (prefers-reduced-motion: reduce) {
        #app-splash .splash-mark,
        #app-splash .splash-name,
        #app-splash .splash-sub,
        #app-splash .splash-bar i {
          animation: none;
        }
        #app-splash .splash-bar i { width: 90%; }
      }
    </style>
    <script>
      (function () {
        // Zegar minimalnego czasu widoczności startuje przy parsowaniu dokumentu.
        window.__SPLASH_START__ = Date.now();

        if (window.navigator.standalone === true) {
          document.documentElement.classList.add('is-standalone');
        }

        // Bezpiecznik. Żyje w HTML, więc zadziała nawet gdy chunk aplikacji
        // nie zostanie pobrany albo wywali się przy montowaniu Reacta.
        setTimeout(function () {
          var el = document.getElementById('app-splash');
          if (!el) return;
          el.classList.add('is-hidden');
          setTimeout(function () { el.remove(); }, 400);
        }, 6000);
      })();
    </script>
```

- [ ] **Step 2: Dodaj markup splashu do `<body>`**

W `apps/web/index.html` zastąp:

```html
  <body>
    <div id="root"></div>
```

przez:

```html
  <body>
    <div id="app-splash" role="status" aria-label="Ładowanie aplikacji BeskidStudio">
      <svg class="splash-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M18 47V17h14.5c8 0 13 3.8 13 10 0 3.7-2 6.5-5.4 7.8 4.2 1.1 6.4 4 6.4 8.1C46.5 50 41 54 32.2 54H25v-7h7.2c4.3 0 6.7-1.5 6.7-4.5S36.6 38 32.2 38H25v9h-7Zm7-16h7c3.8 0 5.8-1.3 5.8-3.9 0-2.5-2-3.7-5.8-3.7h-7V31Z" fill="#F4F9F5"/>
        <path d="M43 10c5 5 5.2 11.1.5 16.3-5.4-3.7-6-9.4-.5-16.3Z" fill="#C4965A"/>
      </svg>
      <p class="splash-name">BeskidStudio</p>
      <p class="splash-sub">by Wiktoria Ćwik</p>
      <div class="splash-bar"><i></i></div>
    </div>
    <div id="root"></div>
```

Kształty `path` to ten sam monogram co w `public/favicon.svg`, przekolorowany na ciemne tło (tam litera jest zielona na kremowym prostokącie; tutaj kremowa, bez prostokąta).

- [ ] **Step 3: Zmień kolor tła w manifeście**

W `apps/web/public/manifest.json` zmień:

```json
  "background_color": "#ffffff",
```

na:

```json
  "background_color": "#1A3828",
```

To ustawia tło splashu generowanego przez Androida, żeby przechodziło bez błysku w nasz splash HTML.

- [ ] **Step 4: Zbuduj i uruchom podgląd**

```bash
pnpm build
pnpm preview
```

Oczekiwane: build bez błędów. Zapisz adres z `pnpm preview` (domyślnie `http://localhost:4173`).

- [ ] **Step 5: Sprawdź, że w przeglądarce splashu nie widać**

Otwórz adres podglądu w Chrome. Oczekiwane: strona główna renderuje się normalnie, splash nie miga ani przez klatkę. W konsoli DevTools:

```js
getComputedStyle(document.getElementById('app-splash')).display
```

Oczekiwane: `"none"` (lub `null`-owy błąd, jeśli element już zniknął — wtedy zamiast tego sprawdź `document.getElementById('app-splash')`, powinno zwrócić `null` dopiero po zgaszeniu).

- [ ] **Step 6: Sprawdź, że w trybie standalone splash działa**

W DevTools: menu ⋮ → More tools → Rendering → sekcja **Emulate CSS media feature `display-mode`** → ustaw `standalone`. Odśwież stronę.

Oczekiwane:
1. Natychmiast po odświeżeniu widać ciemnozielony ekran z monogramem, napisem „BeskidStudio", podpisem i złotym paskiem.
2. Ekran utrzymuje się co najmniej ~0,7 s.
3. Płynnie znika (fade ~0,4 s).
4. Po zniknięciu `document.getElementById('app-splash')` zwraca `null` — element został usunięty z DOM, a nie tylko ukryty.

- [ ] **Step 7: Sprawdź zachowanie na wolnym łączu**

W DevTools → Network → throttling `Slow 3G`, przy nadal włączonej emulacji `standalone`, odśwież (Ctrl+Shift+R).

Oczekiwane: splash utrzymuje się przez cały czas ładowania i znika dopiero po pojawieniu się aplikacji. Bez migotania i bez białego ekranu pomiędzy.

- [ ] **Step 8: Sprawdź bezpiecznik**

Tymczasowo dodaj na początku `apps/web/src/main.tsx` (pierwsza linia po importach):

```ts
throw new Error('test bezpiecznika splashu');
```

Zbuduj (`pnpm build`), odśwież podgląd z emulacją `standalone`.

Oczekiwane: splash znika po ~6 s mimo tego, że aplikacja się nie uruchomiła (w konsoli widać rzucony błąd).

**Następnie usuń tę linię** i przebuduj (`pnpm build`). Potwierdź, że aplikacja znów startuje normalnie.

- [ ] **Step 9: Sprawdź manifest**

DevTools → Application → Manifest.

Oczekiwane: `Background color` = `#1A3828`, brak ostrzeżeń o ikonach.

- [ ] **Step 10: Commit**

```bash
git add apps/web/index.html apps/web/public/manifest.json
git commit -m "feat(pwa): ekran ladowania w index.html i zielone tlo manifestu"
```

---

### Task 3: Obrazki startowe dla iOS

**Files:**
- Create: `apps/web/scripts/generate-splash-screens.mjs`
- Create: `apps/web/public/splash/*.png` (14 plików, generowane)
- Modify: `apps/web/index.html` (14 linków `apple-touch-startup-image` w `<head>`)

**Interfaces:**
- Consumes: z Zadania 2 — paleta i lockup (tło `#1A3828`, monogram kremowy + listek oak, napis „BeskidStudio", podpis „BY WIKTORIA ĆWIK").
- Produces: pliki `public/splash/<nazwa>.png` o nazwach dokładnie takich, jak w tabeli w Kroku 3.

**Ważne o zależnościach:** `sharp` **nie** jest osiągalny z `apps/web` i **nie wolno go tam dodawać** (to ~30 MB natywnej binarki, która trafiłaby do instalacji na VPS). Skrypt uruchamiamy przez workspace `cosmo-server`, który już ma `sharp`. Dlatego skrypt ustala ścieżkę wyjściową z `import.meta.url`, a nie z `process.cwd()`.

- [ ] **Step 1: Napisz generator**

Utwórz `apps/web/scripts/generate-splash-screens.mjs`:

```js
// Generator obrazków startowych iOS (apple-touch-startup-image).
//
// Uruchamiany RĘCZNIE, wynik jest commitowany — nie chcemy natywnej binarki
// sharp w zależnościach apps/web ani generowania przy każdym buildzie.
//
// Uruchomienie z katalogu cosmo-app/:
//   pnpm --filter cosmo-server exec node ../web/scripts/generate-splash-screens.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(SCRIPT_DIR, '..', 'public', 'splash');

const BG = '#1A3828';
const CREAM = '#F4F9F5';
const OAK = '#C4965A';
const MINK = '#5A7A62';

// Monogram — te same kształty co w public/favicon.svg i w splashu w index.html.
const MARK_LETTER =
  'M18 47V17h14.5c8 0 13 3.8 13 10 0 3.7-2 6.5-5.4 7.8 4.2 1.1 6.4 4 6.4 8.1C46.5 50 41 54 32.2 54H25v-7h7.2c4.3 0 6.7-1.5 6.7-4.5S36.6 38 32.2 38H25v9h-7Zm7-16h7c3.8 0 5.8-1.3 5.8-3.9 0-2.5-2-3.7-5.8-3.7h-7V31Z';
const MARK_LEAF = 'M43 10c5 5 5.2 11.1.5 16.3-5.4-3.7-6-9.4-.5-16.3Z';

// Tylko portret — manifest.json wymusza orientation: portrait.
const DEVICES = [
  { name: 'iphone-se1', width: 640, height: 1136 },
  { name: 'iphone-8', width: 750, height: 1334 },
  { name: 'iphone-8-plus', width: 1242, height: 2208 },
  { name: 'iphone-xr', width: 828, height: 1792 },
  { name: 'iphone-x', width: 1125, height: 2436 },
  { name: 'iphone-xs-max', width: 1242, height: 2688 },
  { name: 'iphone-12', width: 1170, height: 2532 },
  { name: 'iphone-12-pro-max', width: 1284, height: 2778 },
  { name: 'iphone-14-pro', width: 1179, height: 2556 },
  { name: 'iphone-14-pro-max', width: 1290, height: 2796 },
  { name: 'ipad-9-7', width: 1536, height: 2048 },
  { name: 'ipad-10-5', width: 1668, height: 2224 },
  { name: 'ipad-11', width: 1668, height: 2388 },
  { name: 'ipad-pro-12-9', width: 2048, height: 2732 },
];

function buildSvg(width, height) {
  const short = Math.min(width, height);
  const mark = Math.round(short * 0.24);
  const nameSize = Math.round(short * 0.075);
  const subSize = Math.round(short * 0.026);
  const cx = width / 2;
  const cy = height / 2;
  const markTop = cy - mark * 1.05;
  const nameBaseline = cy + mark * 0.55;
  const subBaseline = nameBaseline + subSize * 2.4;

  // Georgia/Helvetica zamiast Playfair/DM Sans — sharp renderuje tekst przez
  // fonty systemowe, a webfontów projektu nie ma w systemie. Georgia jest
  // wizualnie bliska Playfair Display i to ten sam fallback co w index.html.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${cx - mark / 2} ${markTop}) scale(${mark / 64})">
    <path d="${MARK_LETTER}" fill="${CREAM}"/>
    <path d="${MARK_LEAF}" fill="${OAK}"/>
  </g>
  <text x="${cx}" y="${nameBaseline}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${nameSize}" fill="${CREAM}">BeskidStudio</text>
  <text x="${cx}" y="${subBaseline}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${subSize}" letter-spacing="${(subSize * 0.16).toFixed(2)}" fill="${MINK}">BY WIKTORIA ĆWIK</text>
</svg>`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const device of DEVICES) {
  const file = path.join(OUT_DIR, `${device.name}.png`);
  await sharp(buildSvg(device.width, device.height))
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`✓ ${device.name}.png  ${device.width}×${device.height}`);
}

console.log(`\nGotowe: ${DEVICES.length} plików w ${OUT_DIR}`);
```

- [ ] **Step 2: Wygeneruj obrazki**

Z katalogu `cosmo-app/`:

```bash
pnpm --filter cosmo-server exec node ../web/scripts/generate-splash-screens.mjs
```

Oczekiwane: 14 linijek `✓ ...png` i komunikat końcowy.

- [ ] **Step 3: Obejrzyj wynik**

Otwórz `apps/web/public/splash/iphone-14-pro.png` w podglądzie obrazów.

Oczekiwane: ciemnozielone tło, wyśrodkowany kremowy monogram „B" ze złotym listkiem, pod nim napis „BeskidStudio" i mniejszy „BY WIKTORIA ĆWIK".

Jeśli któryś napis się **nie** wyrenderował (samo tło i monogram), znaczy że `sharp` nie znalazł fontu systemowego. Wtedy zamień w `buildSvg` `font-family="Georgia, 'Times New Roman', serif"` na `font-family="serif"` i `font-family="Helvetica, Arial, sans-serif"` na `font-family="sans-serif"`, i wygeneruj ponownie.

- [ ] **Step 4: Dodaj linki do `index.html`**

W `apps/web/index.html` wstaw poniższy blok bezpośrednio po linii `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`:

```html
    <!-- Obrazki startowe iOS. Bez nich iPhone pokazuje biały ekran, zanim
         w ogóle uruchomi stronę. Generowane przez scripts/generate-splash-screens.mjs -->
    <link rel="apple-touch-startup-image" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iphone-se1.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iphone-8.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-8-plus.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/iphone-xr.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-x.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-xs-max.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-12.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-12-pro-max.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-14-pro.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/splash/iphone-14-pro-max.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/ipad-9-7.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/ipad-10-5.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/ipad-11.png" />
    <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/splash/ipad-pro-12-9.png" />
```

- [ ] **Step 5: Potwierdź, że obrazki nie wchodzą do precache**

Sprawdź `apps/web/vite.config.ts:32-49` — lista `globPatterns` nie zawiera wzorca pasującego do `splash/*.png`. **Nie dodawaj go.** iOS pobiera te obrazki przy instalacji, a precache jest świadomie odchudzony, żeby pierwsza wizyta nie ciągnęła megabajtów.

```bash
pnpm build
grep -c "splash/" dist/sw.js || echo 0
```

Oczekiwane: `0` — żaden plik ze `splash/` nie trafił do manifestu Service Workera. (`grep -c` kończy się kodem 1, gdy nic nie znajdzie, stąd `|| echo 0`.)

- [ ] **Step 6: Potwierdź, że obrazki znalazły się w buildzie**

```bash
ls dist/splash | wc -l
```

Oczekiwane: `14`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/scripts/generate-splash-screens.mjs apps/web/public/splash apps/web/index.html
git commit -m "feat(pwa): obrazki startowe iOS dla ekranu ladowania"
```

---

### Task 4: Weryfikacja końcowa

**Files:**
- Modify: brak (samo sprawdzanie; ewentualne poprawki wracają do zadań wyżej)

**Interfaces:**
- Consumes: całość z Zadań 1–3.
- Produces: nic — brama jakości przed deployem.

- [ ] **Step 1: Pełny zestaw testów i lint**

Z katalogu `apps/web`:

```bash
pnpm vitest run
pnpm lint
pnpm build
```

Oczekiwane: wszystkie testy PASS, lint bez ostrzeżeń, build kończy się sukcesem razem z `generate-seo-pages.mjs` i `audit-seo-pages.mjs`.

- [ ] **Step 2: Sprawdź, że strony SEO nie ucierpiały**

```bash
grep -c "app-splash" dist/uslugi/laminacja-brwi/index.html
```

Oczekiwane: `1` — markup splashu propaguje się do wygenerowanych stron (szablonem jest `dist/index.html`) i to jest w porządku: poza trybem standalone ma `display: none` i nie pobiera zasobów. Jeśli wynik to `0`, sprawdź czy plik istnieje — nazwa usługi mogła się zmienić; wtedy użyj dowolnej ścieżki z `ls dist/uslugi`.

- [ ] **Step 3: Matryca ręcznych sprawdzeń w podglądzie**

```bash
pnpm preview
```

| Warunek | Oczekiwane |
|---|---|
| Zwykła przeglądarka | Splash niewidoczny, strona renderuje się bez zmian |
| Emulacja `display-mode: standalone` | Splash widoczny ≥0,7 s, gaśnie płynnie, znika z DOM |
| `standalone` + throttling Slow 3G | Splash trzyma się przez całe ładowanie, bez migotania |
| `standalone` + `prefers-reduced-motion: reduce` (DevTools → Rendering) | Splash statyczny: bez pulsowania i bez animacji paska, sam fade przy znikaniu |
| Application → Manifest | `background_color` = `#1A3828` |

- [ ] **Step 4: Deploy i test na urządzeniach**

Deploy uruchamia **użytkownik** — nie rób tego bez wyraźnej zgody:

```bash
./deploy.sh frontend
```

Po deployu, na telefonie:
- **Android/Chrome** → zainstaluj aplikację → uruchom z ikony. Oczekiwane: zielony splash systemowy przechodzi bez błysku w nasz splash HTML.
- **iOS/Safari** → Udostępnij → Dodaj do ekranu głównego → uruchom z ikony. Oczekiwane: od razu zielony obrazek startowy, potem nasz splash HTML, potem aplikacja. Uwaga: iOS agresywnie cache'uje obrazki startowe — jeśli widać starą wersję, usuń ikonę z ekranu głównego i dodaj ponownie.

- [ ] **Step 5: Zaktualizuj CLAUDE.md**

W `CLAUDE.md`, w sekcji o froncie, dopisz po linii opisującej `components/PwaInstallButton.tsx`:

```markdown
- **Splash PWA** — ekran ładowania widoczny tylko w trybie standalone; markup, style i bezpiecznik 6 s inline w `apps/web/index.html`, logika czasowa w `src/splash.ts` (`hideSplash()` wołane z `main.tsx`); obrazki startowe iOS w `public/splash/` generowane ręcznie przez `scripts/generate-splash-screens.mjs` (wymaga `sharp` z workspace `cosmo-server`)
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: opis splashu PWA w CLAUDE.md"
```
