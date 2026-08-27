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

const SUMMARY_WITH_PARAMS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:params-1
SUMMARY;LANGUAGE=pl:Spotkanie
LOCATION;LANGUAGE=pl:Warszawa
DTSTART:20260910T090000Z
DTEND:20260910T100000Z
END:VEVENT
END:VCALENDAR`;

const NO_DTEND = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:no-dtend-1
SUMMARY:Bez końca
DTSTART:20260910T090000Z
END:VEVENT
END:VCALENDAR`;

const NO_UID_TWICE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
SUMMARY:Bez UID rano
DTSTART:20260910T080000Z
DTEND:20260910T083000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Bez UID wieczorem
DTSTART:20260910T180000Z
DTEND:20260910T183000Z
END:VEVENT
END:VCALENDAR`;

const NOT_A_CALENDAR = '<html><body>Błąd 503 — spróbuj później</body></html>';

const EMPTY_BUT_VALID = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Test//PL\nEND:VCALENDAR';

const TRUNCATED_MID_FILE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//PL
BEGIN:VEVENT
UID:cut-1
SUMMARY:Urwane w połowie
DTSTART:20260910T090000Z`;

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
    expect(parseIcs(EMPTY_BUT_VALID, WINDOW_START, WINDOW_END)).toHaveLength(0);
  });

  it('rzuca błąd dla tekstu, który nie jest kalendarzem .ics, ale nie dla legalnego pustego kalendarza', () => {
    expect(() => parseIcs(NOT_A_CALENDAR, WINDOW_START, WINDOW_END)).toThrow();
    expect(() => parseIcs(EMPTY_BUT_VALID, WINDOW_START, WINDOW_END)).not.toThrow();
  });

  it('rzuca błąd dla pliku urwanego w połowie (brak END:VCALENDAR)', () => {
    expect(() => parseIcs(TRUNCATED_MID_FILE, WINDOW_START, WINDOW_END)).toThrow(
      /END:VCALENDAR/,
    );
  });

  it('odpakowuje SUMMARY/LOCATION z parametrami (np. LANGUAGE) do zwykłego stringa', () => {
    const events = parseIcs(SUMMARY_WITH_PARAMS, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Spotkanie');
    expect(events[0].location).toBe('Warszawa');
  });

  it('wydarzenie bez DTEND dostaje domyślną długość 60 minut zamiast zera', () => {
    const events = parseIcs(NO_DTEND, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(1);
    expect(events[0].endsAt.getTime() - events[0].startsAt.getTime()).toBe(60 * 60 * 1000);
  });

  it('dwa wydarzenia bez UID o różnych godzinach dostają różne, stabilne uid', () => {
    const events = parseIcs(NO_UID_TWICE, WINDOW_START, WINDOW_END);
    expect(events).toHaveLength(2);
    expect(events[0].uid).not.toBe(events[1].uid);
    for (const e of events) {
      expect(e.uid).toContain('bez-uid-');
    }
    // stabilność między synchronizacjami tego samego pliku
    const again = parseIcs(NO_UID_TWICE, WINDOW_START, WINDOW_END);
    expect(again.map((e) => e.uid).sort()).toEqual(events.map((e) => e.uid).sort());
  });
});
