import { describe, it, expect } from 'vitest';
import { cardDensity } from './cardDensity';

describe('cardDensity', () => {
  it('krótka wizyta daje compact', () => {
    expect(cardDensity(15)).toBe('compact');
    expect(cardDensity(30)).toBe('compact');
  });

  it('próg 45 minut oddziela compact od medium', () => {
    expect(cardDensity(44)).toBe('compact');
    expect(cardDensity(45)).toBe('medium');
  });

  it('próg 90 minut oddziela medium od full', () => {
    expect(cardDensity(89)).toBe('medium');
    expect(cardDensity(90)).toBe('full');
  });

  it('długa wizyta daje full', () => {
    expect(cardDensity(180)).toBe('full');
  });

  it('wartości bezsensowne dają compact', () => {
    expect(cardDensity(0)).toBe('compact');
    expect(cardDensity(-30)).toBe('compact');
    expect(cardDensity(NaN)).toBe('compact');
    expect(cardDensity(Infinity)).toBe('full');
  });
});
