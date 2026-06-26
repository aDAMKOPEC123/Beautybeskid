import { describe, it, expect } from 'vitest';
import { calculateWeekSlotsCount, resolveEmployeeBlocks } from './employees.service';

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

describe('resolveEmployeeBlocks', () => {
  it('returns null when no workday exists — employee unavailable by default', () => {
    expect(resolveEmployeeBlocks(null)).toBeNull();
  });

  it('returns null when workday has isWorking=false', () => {
    expect(resolveEmployeeBlocks({ isWorking: false, timeBlocks: null })).toBeNull();
  });

  it('returns timeBlocks when workday isWorking=true', () => {
    const blocks = [{ start: '09:00', end: '17:00' }];
    expect(resolveEmployeeBlocks({ isWorking: true, timeBlocks: blocks })).toEqual(blocks);
  });

  it('returns DEFAULT_TIME_BLOCKS when isWorking=true but timeBlocks is null', () => {
    const result = resolveEmployeeBlocks({ isWorking: true, timeBlocks: null });
    expect(result).toEqual([{ start: '09:00', end: '18:00' }]);
  });
});
