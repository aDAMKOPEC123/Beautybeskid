import { describe, it, expect } from 'vitest';
import { splitByDay, splitAllDayByDay, isCoveredByBlock, type DayChunk } from './appleCoverage';
import type { CalendarBlock } from '@/api/calendar-blocks.api';

const d = (iso: string) => new Date(iso);

const block = (partial: Partial<CalendarBlock>): CalendarBlock => ({
  id: 'b1',
  startsAt: '2026-09-03T00:00:00',
  endsAt: '2026-09-03T23:59:00',
  reason: null,
  appliesToAll: true,
  employees: [],
  ...partial,
});

describe('splitByDay', () => {
  it('zwraca jeden nietknięty kawałek dla wydarzenia w obrębie doby', () => {
    const chunks = splitByDay(d('2026-09-03T14:00:00'), d('2026-09-03T16:30:00'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start.toISOString()).toBe(d('2026-09-03T14:00:00').toISOString());
    expect(chunks[0].end.toISOString()).toBe(d('2026-09-03T16:30:00').toISOString());
  });

  it('rozbija wydarzenie trzydniowe na trzy kawałki', () => {
    const chunks = splitByDay(d('2026-09-03T22:00:00'), d('2026-09-05T10:00:00'));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].start.getHours()).toBe(22);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
    expect(chunks[1].start.getDate()).toBe(4);
    expect(chunks[1].start.getHours()).toBe(0);
    expect(chunks[2].start.getDate()).toBe(5);
    expect(chunks[2].end.getHours()).toBe(10);
  });

  it('wydarzenie całodniowe daje jeden kawałek 00:00–23:59, bez pustego dnia następnego', () => {
    const chunks = splitByDay(d('2026-09-03T00:00:00'), d('2026-09-04T00:00:00'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start.getDate()).toBe(3);
    expect(chunks[0].end.getDate()).toBe(3);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
  });

  it('żaden kawałek nie przekracza granicy doby', () => {
    const chunks = splitByDay(d('2026-09-03T08:00:00'), d('2026-09-06T09:00:00'));
    for (const c of chunks) {
      expect(c.start.getDate()).toBe(c.end.getDate());
    }
  });

  it('zwraca pustą listę gdy koniec nie jest późniejszy niż początek', () => {
    expect(splitByDay(d('2026-09-03T10:00:00'), d('2026-09-03T10:00:00'))).toEqual([]);
    expect(splitByDay(d('2026-09-03T10:00:00'), d('2026-09-03T09:00:00'))).toEqual([]);
  });

  it('koniec z niezerowymi sekundami zostaje zaokrąglony w górę do pełnej minuty', () => {
    const chunks = splitByDay(d('2026-09-03T14:00:00'), d('2026-09-03T16:30:45'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].end.getHours()).toBe(16);
    expect(chunks[0].end.getMinutes()).toBe(31);
    expect(chunks[0].end.getSeconds()).toBe(0);
  });

  it('koniec już wyrównany do pełnej minuty zostaje bez zmian', () => {
    const chunks = splitByDay(d('2026-09-03T14:00:00'), d('2026-09-03T16:30:00'));
    expect(chunks[0].end.toISOString()).toBe(d('2026-09-03T16:30:00').toISOString());
  });

  it('koniec o 23:59:45 jest przycinany do 23:59:00 tej samej doby, a nie przelewa się na dobę następną', () => {
    const chunks = splitByDay(d('2026-09-03T22:00:00'), d('2026-09-03T23:59:45'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].end.getDate()).toBe(3);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
    expect(chunks[0].end.getSeconds()).toBe(0);
  });
});

describe('isCoveredByBlock', () => {
  const chunk: DayChunk = { start: d('2026-09-03T14:00:00'), end: d('2026-09-03T16:30:00') };

  it('blokada całego salonu obejmująca kawałek daje true', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T13:00:00', endsAt: '2026-09-03T18:00:00',
    })])).toBe(true);
  });

  it('blokada o krańcach równych krańcom kawałka daje true', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T14:00:00', endsAt: '2026-09-03T16:30:00',
    })])).toBe(true);
  });

  it('blokada pokrywająca kawałek częściowo daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T14:00:00', endsAt: '2026-09-03T15:00:00',
    })])).toBe(false);
  });

  it('blokada per-pracownik obejmująca cały kawałek daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T13:00:00', endsAt: '2026-09-03T18:00:00',
      appliesToAll: false, employees: [{ id: 'e1', name: 'Ala' }],
    })])).toBe(false);
  });

  it('blokada kończąca się dokładnie na początku kawałka daje false', () => {
    expect(isCoveredByBlock(chunk, [block({
      startsAt: '2026-09-03T10:00:00', endsAt: '2026-09-03T14:00:00',
    })])).toBe(false);
  });

  it('pusta lista blokad daje false', () => {
    expect(isCoveredByBlock(chunk, [])).toBe(false);
  });

  // Świadoma decyzja specu (sekcja "Wykrywanie, że godziny są już zablokowane"):
  // isCoveredByBlock nie scala zakresów blokad. Dwie stykające się blokady,
  // które razem pokrywają kawałek, ale żadna z osobna go nie pokrywa, dają
  // false. To nie jest przeoczenie — nie "naprawiać" przez sumowanie zakresów.
  it('dwie stykające się blokady pokrywające kawałek łącznie (ale nie osobno) dają false', () => {
    expect(isCoveredByBlock(chunk, [
      block({ startsAt: '2026-09-03T13:00:00', endsAt: '2026-09-03T15:00:00' }),
      block({ startsAt: '2026-09-03T15:00:00', endsAt: '2026-09-03T18:00:00' }),
    ])).toBe(false);
  });
});

describe('splitAllDayByDay', () => {
  // Backend zapisuje wydarzenia całodniowe jako północ UTC dnia kalendarzowego.
  const utcMidnight = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day));

  it('jednodniowy urlop daje jeden kafel od lokalnej północy do 23:59', () => {
    const chunks = splitAllDayByDay(utcMidnight(2026, 8, 3), utcMidnight(2026, 8, 4));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].start.getDate()).toBe(3);
    expect(chunks[0].start.getHours()).toBe(0);
    expect(chunks[0].start.getMinutes()).toBe(0);
    expect(chunks[0].end.getDate()).toBe(3);
    expect(chunks[0].end.getHours()).toBe(23);
    expect(chunks[0].end.getMinutes()).toBe(59);
  });

  it('trzydniowy urlop daje trzy kafle, po jednym na kolejny dzień', () => {
    const chunks = splitAllDayByDay(utcMidnight(2026, 8, 3), utcMidnight(2026, 8, 6));
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.start.getDate())).toEqual([3, 4, 5]);
    for (const c of chunks) {
      expect(c.start.getHours()).toBe(0);
      expect(c.end.getHours()).toBe(23);
      // Kafel nie przechodzi przez północ — modal blokad operuje na jednej dacie.
      expect(c.start.getDate()).toBe(c.end.getDate());
    }
  });

  it('urlop na przełomie miesiąca przechodzi na kolejny miesiąc', () => {
    // Koniec jest wyłączny, jak w formacie ICS: DTEND 2 października znaczy, że
    // ostatnim dniem urlopu jest 1 października.
    const chunks = splitAllDayByDay(utcMidnight(2026, 8, 30), utcMidnight(2026, 9, 2));
    expect(chunks).toHaveLength(2);
    expect(chunks.map((c) => c.start.getDate())).toEqual([30, 1]);
    expect(chunks.map((c) => c.start.getMonth())).toEqual([8, 9]);
  });

  it('koniec nie późniejszy niż początek daje pustą listę', () => {
    expect(splitAllDayByDay(utcMidnight(2026, 8, 3), utcMidnight(2026, 8, 3))).toEqual([]);
  });
});
