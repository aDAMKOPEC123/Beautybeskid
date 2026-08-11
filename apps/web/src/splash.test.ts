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
