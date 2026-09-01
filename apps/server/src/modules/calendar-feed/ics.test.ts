import { describe, it, expect } from 'vitest';
import { buildIcs, type IcsEvent } from './ics';

const ev = (partial: Partial<IcsEvent> = {}): IcsEvent => ({
  uid: 'appointment-abc@kosmetologwiktoriacwik.pl',
  start: new Date(Date.UTC(2026, 8, 3, 12, 0, 0)),
  end: new Date(Date.UTC(2026, 8, 3, 13, 30, 0)),
  summary: 'Kowalska — Manicure',
  ...partial,
});

const lines = (ics: string) => ics.split('\r\n');

describe('buildIcs', () => {
  it('otwiera i zamyka kalendarz', () => {
    const out = buildIcs([ev()], 'COSMO — wizyty');
    expect(lines(out)[0]).toBe('BEGIN:VCALENDAR');
    expect(lines(out).filter((l) => l !== '').pop()).toBe('END:VCALENDAR');
  });

  it('rozdziela wszystkie linie przez CRLF', () => {
    const out = buildIcs([ev()], 'COSMO');
    // Żadna samotna \n bez poprzedzającego \r.
    expect(/[^\r]\n/.test(out)).toBe(false);
  });

  it('escapuje średnik, przecinek, ukośnik i nową linię', () => {
    const out = buildIcs([ev({ summary: 'a;b,c\\d', description: 'linia1\nlinia2' })], 'COSMO');
    expect(out).toContain('SUMMARY:a\\;b\\,c\\\\d');
    expect(out).toContain('DESCRIPTION:linia1\\nlinia2');
  });

  it('escapuje średnik i przecinek w polu UID', () => {
    const out = buildIcs([ev({ uid: 'appointment-a;b,c@kosmetolog.pl' })], 'COSMO');
    expect(out).toContain('UID:appointment-a\\;b\\,c@kosmetolog.pl');
  });

  it('zawija linię dłuższą niż 75 bajtów, kontynuacja zaczyna się spacją', () => {
    const out = buildIcs([ev({ summary: 'a'.repeat(200) })], 'COSMO');
    const summaryIdx = lines(out).findIndex((l) => l.startsWith('SUMMARY:'));
    expect(lines(out)[summaryIdx + 1].startsWith(' ')).toBe(true);
  });

  it('liczy bajty, nie znaki — 40 polskich liter mieści się w 75 znakach, ale nie w 75 bajtach', () => {
    const summary = 'ą'.repeat(40); // 40 znaków, 80 bajtów; z prefiksem "SUMMARY:" = 88 bajtów
    const out = buildIcs([ev({ summary })], 'COSMO');
    const summaryIdx = lines(out).findIndex((l) => l.startsWith('SUMMARY:'));
    expect(lines(out)[summaryIdx + 1].startsWith(' ')).toBe(true);
  });

  it('nie rozcina znaku wielobajtowego w połowie', () => {
    const out = buildIcs([ev({ summary: 'ż'.repeat(120) })], 'COSMO');
    for (const line of lines(out)) {
      // Ponowne zakodowanie i zdekodowanie nie może wprowadzić znaku zastępczego.
      expect(Buffer.from(line, 'utf8').toString('utf8')).toBe(line);
      expect(line).not.toContain('�');
    }
  });

  it('formatuje daty jako UTC z sufiksem Z', () => {
    const out = buildIcs([ev()], 'COSMO');
    expect(out).toContain('DTSTART:20260903T120000Z');
    expect(out).toContain('DTEND:20260903T133000Z');
  });

  it('pusta lista daje poprawny, pusty kalendarz', () => {
    const out = buildIcs([], 'COSMO');
    expect(out).toContain('BEGIN:VCALENDAR');
    expect(out).toContain('END:VCALENDAR');
    expect(out).not.toContain('BEGIN:VEVENT');
  });

  it('wypisuje SEQUENCE, gdy podany', () => {
    expect(buildIcs([ev({ sequence: 7 })], 'COSMO')).toContain('SEQUENCE:7');
  });

  it('wypisuje SEQUENCE równe zeru — zero jest poprawną wartością, nie brakiem wartości', () => {
    expect(buildIcs([ev({ sequence: 0 })], 'COSMO')).toContain('SEQUENCE:0');
  });

  it('pomija SEQUENCE, gdy nie podano', () => {
    expect(buildIcs([ev()], 'COSMO')).not.toContain('SEQUENCE:');
  });
});
