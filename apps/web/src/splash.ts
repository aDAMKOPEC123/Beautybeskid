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

/**
 * Musi być zgodne z `transition: opacity` na #app-splash w index.html oraz z
 * zagnieżdżonym `setTimeout` bezpiecznika w tamtejszym inline'owym skrypcie —
 * zmiana tej wartości wymaga zaktualizowania obu miejsc.
 */
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
