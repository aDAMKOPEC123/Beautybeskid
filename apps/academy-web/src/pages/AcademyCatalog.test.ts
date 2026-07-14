import { describe, expect, it } from 'vitest';
import { formatPrice } from './AcademyCatalog';

describe('formatPrice', () => {
  it('does not confuse an unpriced course with a free course', () => {
    expect(formatPrice(0, false, false)).toBe('Cena wkrótce');
    expect(formatPrice(0, true, false)).toBe('Bezpłatny');
  });

  it('prioritizes the coming-soon status', () => {
    expect(formatPrice(199, false, true)).toBe('Wkrótce');
  });

  it('formats a paid course in PLN', () => {
    expect(formatPrice(199, false, false)).toContain('199');
    expect(formatPrice(199, false, false)).toContain('zł');
  });
});
