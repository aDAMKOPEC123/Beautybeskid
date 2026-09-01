import { describe, it, expect } from 'vitest';
import {
  initialsOf,
  isExportableStatus,
  appointmentToIcsEvent,
  type FeedAppointment,
} from './calendar-feed.service';

const appt = (partial: Partial<FeedAppointment> = {}): FeedAppointment => ({
  id: 'abc',
  date: new Date(Date.UTC(2026, 8, 3, 12, 0, 0)),
  status: 'CONFIRMED',
  customDurationMinutes: null,
  finalPrice: 180,
  clientName: null,
  clientPhone: null,
  locationAddressAtBooking: 'ul. Testowa 1, Żywiec',
  updatedAt: new Date(Date.UTC(2026, 8, 1, 8, 0, 0)),
  service: { name: 'Manicure hybrydowy', durationMinutes: 60 },
  employee: { name: 'Anna Kowal' },
  user: { name: 'Maria Nowak', phone: '500100200' },
  ...partial,
});

describe('initialsOf', () => {
  it('bierze pierwsze litery dwóch członów', () => {
    expect(initialsOf('Anna Kowal')).toBe('AK');
  });

  it('dla jednego członu zwraca jedną literę', () => {
    expect(initialsOf('Anna')).toBe('A');
  });

  it('radzi sobie z wielokrotnymi spacjami', () => {
    expect(initialsOf('  Anna   Kowal  ')).toBe('AK');
  });
});

describe('isExportableStatus', () => {
  it('odwołane nie trafiają do feedu', () => {
    expect(isExportableStatus('CANCELLED')).toBe(false);
  });

  it('pozostałe statusy trafiają', () => {
    expect(isExportableStatus('PENDING')).toBe(true);
    expect(isExportableStatus('CONFIRMED')).toBe(true);
    expect(isExportableStatus('COMPLETED')).toBe(true);
  });
});

describe('appointmentToIcsEvent', () => {
  it('składa tytuł z klientki, usługi i inicjałów pracownicy', () => {
    expect(appointmentToIcsEvent(appt()).summary)
      .toBe('Maria Nowak — Manicure hybrydowy (AK)');
  });

  it('bez przypisanej pracownicy nie dokłada pustego nawiasu', () => {
    const summary = appointmentToIcsEvent(appt({ employee: null })).summary;
    expect(summary).toBe('Maria Nowak — Manicure hybrydowy');
    expect(summary).not.toContain('()');
  });

  it('wizyta z zewnątrz używa clientName i clientPhone', () => {
    const e = appointmentToIcsEvent(appt({
      user: null, clientName: 'Ewa Zewnętrzna', clientPhone: '600300400',
    }));
    expect(e.summary).toContain('Ewa Zewnętrzna');
    expect(e.description).toContain('600300400');
  });

  it('DTEND liczy się z customDurationMinutes, gdy jest ustawione', () => {
    const e = appointmentToIcsEvent(appt({ customDurationMinutes: 90 }));
    expect(e.end.getTime() - e.start.getTime()).toBe(90 * 60_000);
  });

  it('DTEND liczy się z czasu usługi, gdy nie ma nadpisania', () => {
    const e = appointmentToIcsEvent(appt());
    expect(e.end.getTime() - e.start.getTime()).toBe(60 * 60_000);
  });

  it('UID jest stabilny i zbudowany z identyfikatora wizyty', () => {
    expect(appointmentToIcsEvent(appt()).uid)
      .toBe('appointment-abc@kosmetologwiktoriacwik.pl');
  });

  it('brak telefonu nie zostawia pustej etykiety w opisie', () => {
    const e = appointmentToIcsEvent(appt({ user: { name: 'Maria Nowak', phone: null } }));
    expect(e.description).not.toContain('Telefon:');
  });

  it('adres bierze się z lokalizacji zapisanej przy rezerwacji', () => {
    expect(appointmentToIcsEvent(appt()).location).toBe('ul. Testowa 1, Żywiec');
  });

  it('SEQUENCE jest nieujemną liczbą całkowitą', () => {
    const seq = appointmentToIcsEvent(appt()).sequence!;
    expect(Number.isInteger(seq)).toBe(true);
    expect(seq).toBeGreaterThanOrEqual(0);
  });

  it('późniejsza zmiana wizyty daje większe SEQUENCE — inaczej klient zignorowałby aktualizację', () => {
    const wczesniej = appointmentToIcsEvent(appt({ updatedAt: new Date(Date.UTC(2026, 8, 1, 8, 0, 0)) })).sequence!;
    const pozniej = appointmentToIcsEvent(appt({ updatedAt: new Date(Date.UTC(2026, 8, 1, 8, 0, 30)) })).sequence!;
    expect(pozniej).toBeGreaterThan(wczesniej);
  });

  it('SEQUENCE mieści się w zakresie 32-bitowym, którego oczekują klienty kalendarza', () => {
    const seq = appointmentToIcsEvent(appt({ updatedAt: new Date(Date.UTC(2030, 0, 1)) })).sequence!;
    expect(seq).toBeLessThan(2_147_483_647);
  });

  it('data sprzed epoki odniesienia nie daje ujemnego SEQUENCE', () => {
    const seq = appointmentToIcsEvent(appt({ updatedAt: new Date(Date.UTC(2019, 0, 1)) })).sequence!;
    expect(seq).toBe(0);
  });
});
