import { describe, it, expect } from 'vitest';
import { parseIcs } from './external-calendar.parser';

const WINDOW_START = new Date('2026-09-01T00:00:00Z');
const WINDOW_END = new Date('2026-10-01T00:00:00Z');

const SINGLE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:single-1
SUMMARY:Dentysta
LOCATION:Kraków
DTSTART:20260910T090000Z
DTEND:20260910T100000Z
END:VEVENT
END:VCALENDAR`;

const RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:weekly-1
SUMMARY:Joga
DTSTART:20260907T170000Z
DTEND:20260907T180000Z
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
END:VCALENDAR`;

const OUTSIDE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:old-1
SUMMARY:Stare wydarzenie
DTSTART:20250101T090000Z
DTEND:20250101T100000Z
END:VEVENT
END:VCALENDAR`;

describe('parseIcs', () => {
  it('parsuje pojedyncze wydarzenie', () => {
    const events = parseIcs(SINGLE, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe('single-1');
    expect(events[0].title).toBe('Dentysta');
    expect(events[0].location).toBe('Kraków');
    expect(events[0].startsAt.toISOString()).toBe('2026-09-10T09:00:00.000Z');
    expect(events[0].endsAt.toISOString()).toBe('2026-09-10T10:00:00.000Z');
  });

  it('rozwija wydarzenie cykliczne na osobne wystąpienia', () => {
    const events = parseIcs(RECURRING, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(4);
    expect(new Set(events.map((e) => e.uid))).toEqual(new Set(['weekly-1']));
    const starts = events.map((e) => e.startsAt.toISOString()).sort();
    expect(starts[0]).toBe('2026-09-07T17:00:00.000Z');
    expect(starts[3]).toBe('2026-09-28T17:00:00.000Z');
  });

  it('każde wystąpienie cykliczne zachowuje długość oryginału', () => {
    const events = parseIcs(RECURRING, WINDOW_START, WINDOW_END);
    for (const e of events) {
      expect(e.endsAt.getTime() - e.startsAt.getTime()).toBe(60 * 60 * 1000);
    }
  });

  it('pomija wydarzenia spoza okna', () => {
    expect(parseIcs(OUTSIDE, WINDOW_START, WINDOW_END)).toHaveLength(0);
  });

  it('zwraca pustą listę dla pustego kalendarza', () => {
    const empty = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Test//PL\nEND:VCALENDAR';
    expect(parseIcs(empty, WINDOW_START, WINDOW_END)).toHaveLength(0);
  });
});
