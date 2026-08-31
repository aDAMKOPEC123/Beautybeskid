import { describe, it, expect } from 'vitest';
import { startOfWeek, weekDays, weeksOfMonth } from './calendarWeeks';

const d = (iso: string) => new Date(`${iso}T00:00:00`);
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

describe('startOfWeek', () => {
  it('zwraca poniedziałek dla dnia w środku tygodnia', () => {
    // 2026-09-09 to środa
    expect(iso(startOfWeek(d('2026-09-09')))).toBe('2026-09-07');
  });

  it('dla niedzieli zwraca poniedziałek tego samego tygodnia, nie następnego', () => {
    // 2026-09-13 to niedziela
    expect(iso(startOfWeek(d('2026-09-13')))).toBe('2026-09-07');
  });

  it('dla poniedziałku zwraca ten sam dzień', () => {
    expect(iso(startOfWeek(d('2026-09-07')))).toBe('2026-09-07');
  });
});

describe('weekDays', () => {
  it('zwraca siedem kolejnych dni', () => {
    const days = weekDays(d('2026-09-09'));
    expect(days).toHaveLength(7);
    expect(days.map(iso)).toEqual([
      '2026-09-07', '2026-09-08', '2026-09-09',
      '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
    ]);
  });

  it('zaczyna od poniedziałku niezależnie od podanego dnia', () => {
    expect(iso(weekDays(d('2026-09-13'))[0])).toBe('2026-09-07');
    expect(iso(weekDays(d('2026-09-07'))[0])).toBe('2026-09-07');
  });
});

describe('weeksOfMonth', () => {
  it('wrzesień 2026 (1. wypada we wtorek) daje pięć tygodni z przyciętymi etykietami', () => {
    const weeks = weeksOfMonth(d('2026-09-15'));
    expect(weeks.map((w) => w.label)).toEqual(['1–6', '7–13', '14–20', '21–27', '28–30']);
    expect(iso(weeks[0].start)).toBe('2026-08-31'); // tydzień zaczyna się jeszcze w sierpniu
    expect(iso(weeks[0].end)).toBe('2026-09-06');
    expect(iso(weeks[4].end)).toBe('2026-10-04');   // i kończy już w październiku
  });

  it('miesiąc zaczynający się w poniedziałek nie produkuje tygodnia zerowego', () => {
    // czerwiec 2026 zaczyna się w poniedziałek
    const weeks = weeksOfMonth(d('2026-06-15'));
    expect(weeks[0].label).toBe('1–7');
    expect(iso(weeks[0].start)).toBe('2026-06-01');
  });

  it('luty 2026 kończy się etykietą sięgającą 28', () => {
    const weeks = weeksOfMonth(d('2026-02-15'));
    expect(weeks[weeks.length - 1].label).toBe('23–28');
  });

  it('grudzień przycina ostatnią etykietę do 31, mimo że tydzień sięga stycznia', () => {
    const weeks = weeksOfMonth(d('2026-12-15'));
    const last = weeks[weeks.length - 1];
    expect(last.label).toBe('28–31');
    expect(iso(last.end)).toBe('2027-01-03');
  });

  it('jednodniowa resztka miesiąca daje etykietę bez myślnika', () => {
    // 1 lutego 2026 to niedziela — sam koniec tygodnia zaczętego w styczniu
    const weeks = weeksOfMonth(d('2026-02-15'));
    expect(weeks[0].label).toBe('1');
    expect(iso(weeks[0].start)).toBe('2026-01-26');
  });

  it('ten sam tydzień na przełomie miesięcy ma inną etykietę w każdym z nich', () => {
    const wrzesien = weeksOfMonth(d('2026-09-15'));
    const pazdziernik = weeksOfMonth(d('2026-10-15'));
    const ostatniWrzesnia = wrzesien[wrzesien.length - 1];
    const pierwszyPazdziernika = pazdziernik[0];
    expect(iso(ostatniWrzesnia.start)).toBe(iso(pierwszyPazdziernika.start));
    expect(ostatniWrzesnia.label).toBe('28–30');
    expect(pierwszyPazdziernika.label).toBe('1–4');
  });
});
