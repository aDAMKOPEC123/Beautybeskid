import { describe, it, expect } from 'vitest';
import {
  mergeRanges,
  invertRanges,
  buildWorkingHourLayer,
  DAY_WINDOW_START,
  DAY_WINDOW_END,
} from './calendarLayers';

const W = [DAY_WINDOW_START, DAY_WINDOW_END] as const;

describe('mergeRanges', () => {
  it('scala zakresy nachodzące na siebie', () => {
    expect(mergeRanges([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '14:00' }], ...W))
      .toEqual([{ start: '09:00', end: '14:00' }]);
  });

  it('scala zakresy stykające się krawędzią', () => {
    expect(mergeRanges([{ start: '09:00', end: '12:00' }, { start: '12:00', end: '15:00' }], ...W))
      .toEqual([{ start: '09:00', end: '15:00' }]);
  });

  it('zostawia rozłączne zakresy osobno i sortuje je', () => {
    expect(mergeRanges([{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }], ...W))
      .toEqual([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '16:00' }]);
  });

  it('przycina zakres wystający poza okno', () => {
    expect(mergeRanges([{ start: '05:00', end: '23:00' }], ...W))
      .toEqual([{ start: DAY_WINDOW_START, end: DAY_WINDOW_END }]);
  });

  it('odrzuca zakres całkowicie poza oknem', () => {
    expect(mergeRanges([{ start: '22:00', end: '23:00' }], ...W)).toEqual([]);
  });
});

describe('invertRanges', () => {
  it('pusta lista daje całe okno jako jedną lukę', () => {
    expect(invertRanges([], ...W)).toEqual([{ start: DAY_WINDOW_START, end: DAY_WINDOW_END }]);
  });

  it('jeden blok w środku okna daje dwie luki', () => {
    expect(invertRanges([{ start: '09:00', end: '17:00' }], ...W)).toEqual([
      { start: '07:00', end: '09:00' },
      { start: '17:00', end: '21:00' },
    ]);
  });

  it('blok stykający się z początkiem okna daje jedną lukę po prawej', () => {
    expect(invertRanges([{ start: '07:00', end: '15:00' }], ...W))
      .toEqual([{ start: '15:00', end: '21:00' }]);
  });

  it('bloki podane w odwrotnej kolejności dają ten sam wynik', () => {
    const a = invertRanges([{ start: '14:00', end: '16:00' }, { start: '09:00', end: '12:00' }], ...W);
    const b = invertRanges([{ start: '09:00', end: '12:00' }, { start: '14:00', end: '16:00' }], ...W);
    expect(a).toEqual(b);
    expect(a).toEqual([
      { start: '07:00', end: '09:00' },
      { start: '12:00', end: '14:00' },
      { start: '16:00', end: '21:00' },
    ]);
  });

  it('bloki nachodzące nie produkują luki zerowej długości', () => {
    const gaps = invertRanges([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '14:00' }], ...W);
    expect(gaps).toEqual([{ start: '07:00', end: '09:00' }, { start: '14:00', end: '21:00' }]);
    for (const g of gaps) expect(g.start).not.toBe(g.end);
  });

  it('blok pokrywający całe okno daje pustą listę luk', () => {
    expect(invertRanges([{ start: '07:00', end: '21:00' }], ...W)).toEqual([]);
  });

  it('blok wystający poza okno jest przycinany', () => {
    expect(invertRanges([{ start: '05:00', end: '09:00' }], ...W))
      .toEqual([{ start: '09:00', end: '21:00' }]);
  });
});

describe('buildWorkingHourLayer', () => {
  const employees = [{ id: 'e1', name: 'Ala' }, { id: 'e2', name: 'Ola' }];
  const colorFor = (id: string) => (id === 'e1' ? '#111111' : '#222222');
  // 2026-09-03 to czwartek → dayOfWeek 3 w konwencji API (poniedziałek = 0).
  const rangeStart = new Date('2026-09-03T00:00:00');
  const rangeEnd = new Date('2026-09-04T00:00:00');

  const weekly = (isWorking: boolean, blocks: { start: string; end: string }[]) =>
    new Map([
      ['e1', [{ dayOfWeek: 3, isWorking, timeBlocks: blocks }] as any],
      ['e2', [{ dayOfWeek: 3, isWorking, timeBlocks: blocks }] as any],
    ]);

  const noOverrides = new Map<string, any[]>([['e1', []], ['e2', []]]);

  it('w widoku zasobów każdy pracownik dostaje własne pasy pracy i przygaszenia', () => {
    const events = buildWorkingHourLayer(
      employees, weekly(true, [{ start: '09:00', end: '17:00' }]), noOverrides,
      rangeStart, rangeEnd, null, true, colorFor,
    );
    const work = events.filter((e: any) => e.extendedProps.isWorkingHours);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    expect(work).toHaveLength(2);
    expect(off).toHaveLength(4); // 2 luki × 2 pracownice
    expect(work.every((e: any) => e.resourceId)).toBe(true);
    expect(work.every((e: any) => e.display === 'background')).toBe(true);
    expect((work[0] as any).extendedProps.accentColor).toBe('#111111');
    expect((work[0] as any).extendedProps.rangeLabel).toBe('09:00–17:00');
  });

  it('dzień wolny przygasza całe okno doby', () => {
    const events = buildWorkingHourLayer(
      employees, weekly(false, []), noOverrides,
      rangeStart, rangeEnd, null, true, colorFor,
    );
    expect(events.filter((e: any) => e.extendedProps.isWorkingHours)).toHaveLength(0);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    expect(off).toHaveLength(2); // po jednym pełnym pasie na pracownicę
    expect(off[0].start).toBe('2026-09-03T07:00:00');
    expect(off[0].end).toBe('2026-09-03T21:00:00');
  });

  it('poza widokiem zasobów warstwy są wspólne dla salonu i nie mają resourceId', () => {
    const schedules = new Map([
      ['e1', [{ dayOfWeek: 3, isWorking: true, timeBlocks: [{ start: '09:00', end: '13:00' }] }] as any],
      ['e2', [{ dayOfWeek: 3, isWorking: true, timeBlocks: [{ start: '12:00', end: '17:00' }] }] as any],
    ]);
    const events = buildWorkingHourLayer(
      employees, schedules, noOverrides, rangeStart, rangeEnd, null, false, colorFor,
    );
    const work = events.filter((e: any) => e.extendedProps.isWorkingHours);
    const off = events.filter((e: any) => e.extendedProps.isOffHours);
    // Zakresy obu pracownic scalają się w jeden pas 09:00–17:00.
    expect(work).toHaveLength(1);
    expect(work[0].start).toBe('2026-09-03T09:00:00');
    expect(work[0].end).toBe('2026-09-03T17:00:00');
    expect(off).toHaveLength(2);
    expect(events.every((e: any) => e.resourceId === undefined)).toBe(true);
  });

  it('override dnia ma pierwszeństwo nad grafikiem tygodniowym', () => {
    const overrides = new Map([
      ['e1', [{ date: '2026-09-03', isWorking: false, timeBlocks: [] }] as any],
      ['e2', [] as any],
    ]);
    const events = buildWorkingHourLayer(
      employees, weekly(true, [{ start: '09:00', end: '17:00' }]), overrides,
      rangeStart, rangeEnd, 'e1', true, colorFor,
    );
    expect(events.filter((e: any) => e.extendedProps.isWorkingHours)).toHaveLength(0);
    expect(events.filter((e: any) => e.extendedProps.isOffHours)).toHaveLength(1);
  });
});
