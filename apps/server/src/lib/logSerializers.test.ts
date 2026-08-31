import { describe, it, expect } from 'vitest';
import { maskCalendarFeedToken } from './logSerializers';

// Dowód na Finding C1: token feedu kalendarza (GET /api/calendar-feed/:token/wizyty.ics)
// jest jedynym poświadczeniem dostępu — trasa jest publiczna, Apple nie wysyła
// nagłówka Authorization. Ten test przepuszcza zserializowane żądanie z jawnym
// tokenem przez faktyczny serializer użyty w app.ts i sprawdza, że token nigdzie
// w wyniku się nie pojawia.
describe('maskCalendarFeedToken (Finding C1 — token nie trafia do logów)', () => {
  const rawReq = {
    id: 1,
    method: 'GET',
    url: '/api/calendar-feed/SEKRETNYTOKEN123/wizyty.ics',
    headers: { host: 'kosmetologwiktoriacwik.pl' },
    remoteAddress: '203.0.113.7',
    remotePort: 54321,
    params: { token: 'SEKRETNYTOKEN123' },
    query: {},
  };

  it('maskuje token w url', () => {
    expect(maskCalendarFeedToken(rawReq).url).toBe('/api/calendar-feed/***/wizyty.ics');
  });

  it('maskuje token w params (Express ustawia req.params przed logiem finish)', () => {
    expect(maskCalendarFeedToken(rawReq).params).toEqual({ token: '***' });
  });

  it('cały zserializowany obiekt nie zawiera tokenu w jawnej postaci', () => {
    expect(JSON.stringify(maskCalendarFeedToken(rawReq))).not.toContain('SEKRETNYTOKEN123');
  });

  it('nie zubaża logów pozostałych tras — pola bez związku z feedem przechodzą bez zmian', () => {
    const other = {
      id: 2,
      method: 'POST',
      url: '/api/appointments',
      headers: { host: 'kosmetologwiktoriacwik.pl' },
      remoteAddress: '203.0.113.7',
      remotePort: 54322,
      params: {},
      query: { foo: 'bar' },
    };
    expect(maskCalendarFeedToken(other)).toEqual(other);
  });

  it('trasy panelu (config/regenerate) nie mają maskowanego adresu — nie są feedem', () => {
    const config = { id: 3, method: 'GET', url: '/api/calendar-feed/config', params: {} };
    expect(maskCalendarFeedToken(config).url).toBe('/api/calendar-feed/config');
  });
});
