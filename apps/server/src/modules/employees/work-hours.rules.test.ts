import { describe, it, expect } from 'vitest';
import { mergeTimeBlocks, subtractTimeBlock } from './work-hours.rules';

describe('mergeTimeBlocks', () => {
  it('dodaje rozłączny zakres i sortuje wynik', () => {
    expect(mergeTimeBlocks([{ start: '14:00', end: '16:00' }], { start: '09:00', end: '11:00' }))
      .toEqual([{ start: '09:00', end: '11:00' }, { start: '14:00', end: '16:00' }]);
  });

  it('scala zakres nachodzący w jeden', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '13:00' }], { start: '12:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('scala zakres stykający się krańcem w jeden', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '13:00' }], { start: '13:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('dodanie do pustej listy daje jeden blok', () => {
    expect(mergeTimeBlocks([], { start: '10:00', end: '12:00' }))
      .toEqual([{ start: '10:00', end: '12:00' }]);
  });

  it('zakres zawarty w istniejącym niczego nie zmienia', () => {
    expect(mergeTimeBlocks([{ start: '09:00', end: '17:00' }], { start: '11:00', end: '12:00' }))
      .toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('scala trzy zachodzące na siebie bloki w jeden', () => {
    const blocks = [{ start: '09:00', end: '11:00' }, { start: '10:30', end: '13:00' }];
    expect(mergeTimeBlocks(blocks, { start: '12:30', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });
});

describe('subtractTimeBlock', () => {
  it('odjęcie środka dzieli blok na dwa', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '12:00', end: '13:00' }))
      .toEqual([{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }]);
  });

  it('odjęcie początku skraca blok', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '09:00', end: '11:00' }))
      .toEqual([{ start: '11:00', end: '17:00' }]);
  });

  it('odjęcie końca skraca blok', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '15:00', end: '17:00' }))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('odjęcie całego bloku zostawia pustą listę', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '08:00', end: '18:00' }))
      .toEqual([]);
  });

  it('odjęcie zakresu spoza godzin pracy niczego nie zmienia', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '13:00' }], { start: '15:00', end: '16:00' }))
      .toEqual([{ start: '09:00', end: '13:00' }]);
  });

  it('zakres stykający się krańcem nie obcina bloku', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '13:00' }], { start: '13:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '13:00' }]);
  });

  it('odejmuje z wielu bloków naraz', () => {
    const blocks = [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }];
    expect(subtractTimeBlock(blocks, { start: '11:00', end: '15:00' }))
      .toEqual([{ start: '09:00', end: '11:00' }, { start: '15:00', end: '18:00' }]);
  });

  it('odwrócony zakres (koniec przed początkiem) nie zmienia listy', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '15:00', end: '10:00' }))
      .toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('zakres o zerowej długości nie zmienia listy', () => {
    expect(subtractTimeBlock([{ start: '09:00', end: '17:00' }], { start: '12:00', end: '12:00' }))
      .toEqual([{ start: '09:00', end: '17:00' }]);
  });
});
