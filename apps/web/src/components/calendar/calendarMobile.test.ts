import { describe, it, expect } from 'vitest';
import { shouldShowTodayButton, storageKeyFor } from './calendarMobile';

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h);

describe('shouldShowTodayButton', () => {
  it('nie pokazuje przycisku, gdy stoimy na dzisiejszym dniu', () => {
    expect(shouldShowTodayButton(at(2026, 8, 3), at(2026, 8, 3))).toBe(false);
  });

  it('pokazuje przycisk dla innego dnia', () => {
    expect(shouldShowTodayButton(at(2026, 8, 10), at(2026, 8, 3))).toBe(true);
  });

  it('inna godzina tego samego dnia to nadal dzisiaj — porównujemy datę, nie sygnaturę czasu', () => {
    expect(shouldShowTodayButton(at(2026, 8, 3, 23), at(2026, 8, 3, 1))).toBe(false);
  });

  it('dzień wcześniej i dzień później pokazują przycisk', () => {
    expect(shouldShowTodayButton(at(2026, 8, 2), at(2026, 8, 3))).toBe(true);
    expect(shouldShowTodayButton(at(2026, 8, 4), at(2026, 8, 3))).toBe(true);
  });

  it('ten sam dzień i miesiąc w innym roku pokazuje przycisk', () => {
    expect(shouldShowTodayButton(at(2027, 8, 3), at(2026, 8, 3))).toBe(true);
  });
});

describe('storageKeyFor', () => {
  it('telefon i komputer maja rozne klucze', () => {
    expect(storageKeyFor(true)).not.toBe(storageKeyFor(false));
  });

  it('klucz komputera zostaje ten, ktory juz jest w uzyciu u uzytkownikow', () => {
    expect(storageKeyFor(false)).toBe('cosmo-calendar-legend-open');
  });

  it('klucz telefonu jest wlasny', () => {
    expect(storageKeyFor(true)).toBe('cosmo-calendar-legend-open-mobile');
  });
});
