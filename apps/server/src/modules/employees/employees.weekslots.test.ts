import { describe, it, expect } from 'vitest';
import { calculateWeekSlotsCount } from './employees.service';

describe('calculateWeekSlotsCount', () => {
  it('returns 0 when no scheduled minutes', () => {
    expect(calculateWeekSlotsCount(0, 0)).toBe(0);
  });

  it('divides remaining minutes by 30', () => {
    // 480 scheduled minutes, 120 booked → 360 remaining → 12 slots
    expect(calculateWeekSlotsCount(480, 120)).toBe(12);
  });

  it('floors partial slots', () => {
    // 490 scheduled, 120 booked → 370 remaining → 12.33 → floor → 12
    expect(calculateWeekSlotsCount(490, 120)).toBe(12);
  });

  it('returns 0 when booked >= scheduled', () => {
    expect(calculateWeekSlotsCount(60, 60)).toBe(0);
    expect(calculateWeekSlotsCount(60, 90)).toBe(0);
  });
});
