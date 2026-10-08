import { describe, it, expect } from 'vitest';
import { hasAppointmentConflict } from './appointments.rules';

const at = (time: string) => new Date(`2026-10-17T${time}:00.000Z`);
const existing = (time: string, durationMinutes: number, customDurationMinutes: number | null = null) => ({
  date: at(time),
  customDurationMinutes,
  service: { durationMinutes },
});

describe('hasAppointmentConflict', () => {
  it('pozwala umówić wizytę zaraz po poprzedniej o tej samej długości', () => {
    // 09:00–10:30 zajęte, nowa 90-minutowa wizyta od 10:30
    expect(hasAppointmentConflict(at('10:30'), at('12:00'), [existing('09:00', 90)])).toBe(false);
  });

  it('pozwala umówić wizytę kończącą się dokładnie na początku następnej', () => {
    expect(hasAppointmentConflict(at('09:00'), at('10:30'), [existing('10:30', 60)])).toBe(false);
  });

  it('wykrywa kolizję z dłuższą wizytą, która zaczęła się dużo wcześniej', () => {
    // 08:00–11:00 zajęte, nowa 30-minutowa wizyta od 10:30
    expect(hasAppointmentConflict(at('10:30'), at('11:00'), [existing('08:00', 180)])).toBe(true);
  });

  it('wykrywa kolizję, gdy wizyty częściowo na siebie nachodzą', () => {
    expect(hasAppointmentConflict(at('10:00'), at('11:30'), [existing('09:00', 90)])).toBe(true);
  });

  it('bierze pod uwagę ręcznie ustawiony czas trwania wizyty', () => {
    expect(hasAppointmentConflict(at('10:00'), at('11:00'), [existing('09:00', 90, 60)])).toBe(false);
    expect(hasAppointmentConflict(at('10:00'), at('11:00'), [existing('09:00', 30, 90)])).toBe(true);
  });
});
