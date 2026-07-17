import { describe, expect, it } from 'vitest';
import { calculateAcademyDiscount } from './marketing.service';

describe('Academy marketing pricing', () => {
  it('calculates percentage promotions', () => expect(calculateAcademyDiscount('PERCENTAGE', 20, 250)).toBe(50));
  it('calculates amount promotions', () => expect(calculateAcademyDiscount('AMOUNT', 35, 250)).toBe(35));
  it('never reduces a paid product below one grosz', () => expect(calculateAcademyDiscount('AMOUNT', 999, 100)).toBe(99.99));
  it('does not return a negative discount', () => expect(calculateAcademyDiscount('AMOUNT', -10, 100)).toBe(0));
});
