import { describe, it, expect } from 'vitest';
import { blockAppliesToEmployee, isSlotBlocked, type BlockLike } from './calendar-blocks.rules';

const at = (h: number, m = 0) => new Date(2026, 8, 10, h, m, 0, 0);

const salonBlock: BlockLike = {
  startsAt: at(12), endsAt: at(14), appliesToAll: true, employees: [],
};
const annaBlock: BlockLike = {
  startsAt: at(12), endsAt: at(14), appliesToAll: false, employees: [{ id: 'anna' }],
};

describe('blockAppliesToEmployee', () => {
  it('blokada całego salonu dotyczy każdego pracownika', () => {
    expect(blockAppliesToEmployee(salonBlock, 'anna')).toBe(true);
    expect(blockAppliesToEmployee(salonBlock, 'basia')).toBe(true);
  });

  it('blokada per-pracownik dotyczy tylko wskazanych', () => {
    expect(blockAppliesToEmployee(annaBlock, 'anna')).toBe(true);
    expect(blockAppliesToEmployee(annaBlock, 'basia')).toBe(false);
  });
});

describe('isSlotBlocked', () => {
  it('blokada całego salonu wycina pokrywany slot', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'basia', [salonBlock])).toBe(true);
  });

  it('blokada per-pracownik nie rusza slotu innego pracownika', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'basia', [annaBlock])).toBe(false);
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'anna', [annaBlock])).toBe(true);
  });

  it('blokada kończąca się dokładnie w momencie startu slotu go nie wycina', () => {
    expect(isSlotBlocked(at(14), at(15), 'anna', [salonBlock])).toBe(false);
  });

  it('slot kończący się dokładnie w momencie startu blokady nie jest wycinany', () => {
    expect(isSlotBlocked(at(11), at(12), 'anna', [salonBlock])).toBe(false);
  });

  it('częściowe nachodzenie wycina cały slot', () => {
    expect(isSlotBlocked(at(11, 30), at(12, 30), 'anna', [salonBlock])).toBe(true);
    expect(isSlotBlocked(at(13, 30), at(14, 30), 'anna', [salonBlock])).toBe(true);
  });

  it('slot obejmujący całą blokadę jest wycinany', () => {
    expect(isSlotBlocked(at(11), at(15), 'anna', [salonBlock])).toBe(true);
  });

  it('brak blokad oznacza slot wolny', () => {
    expect(isSlotBlocked(at(12, 30), at(13, 30), 'anna', [])).toBe(false);
  });
});
