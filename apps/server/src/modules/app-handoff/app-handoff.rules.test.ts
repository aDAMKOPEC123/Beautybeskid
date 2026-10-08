import { describe, it, expect } from 'vitest';
import { buildMatchKey, networkKey, normalizeHandoffPath } from './app-handoff.rules';

describe('normalizeHandoffPath', () => {
  it('przepuszcza wewnętrzną ścieżkę z parametrami i kotwicą', () => {
    expect(normalizeHandoffPath('/user/wizyty?tab=history#top')).toBe('/user/wizyty?tab=history#top');
    expect(normalizeHandoffPath('/rezerwacja')).toBe('/rezerwacja');
  });

  it('odrzuca adresy prowadzące poza stronę', () => {
    expect(normalizeHandoffPath('https://evil.example/user')).toBeNull();
    expect(normalizeHandoffPath('//evil.example/user')).toBeNull();
    expect(normalizeHandoffPath('/\\evil.example')).toBeNull();
    expect(normalizeHandoffPath('user/wizyty')).toBeNull();
    expect(normalizeHandoffPath('javascript:alert(1)')).toBeNull();
  });

  it('odrzuca ścieżki techniczne i logowanie', () => {
    expect(normalizeHandoffPath('/api/users/me')).toBeNull();
    expect(normalizeHandoffPath('/uploads/x.png')).toBeNull();
    expect(normalizeHandoffPath('/auth/login')).toBeNull();
  });

  it('odrzuca znaki sterujące, puste i zbyt długie wartości', () => {
    expect(normalizeHandoffPath('/user\n/wizyty')).toBeNull();
    expect(normalizeHandoffPath('')).toBeNull();
    expect(normalizeHandoffPath(`/${'a'.repeat(600)}`)).toBeNull();
  });
});

describe('networkKey', () => {
  it('zostawia IPv4 i zdejmuje prefiks mapowania IPv6', () => {
    expect(networkKey('91.227.218.143')).toBe('91.227.218.143');
    expect(networkKey('::ffff:91.227.218.143')).toBe('91.227.218.143');
  });

  it('skraca IPv6 do sieci /64, bo końcówka adresu zmienia się między połączeniami', () => {
    expect(networkKey('2a02:a31a:1234:5678:1111:2222:3333:4444')).toBe('2a02:a31a:1234:5678');
    expect(networkKey('2A02:A31A:1234:5678:aaaa:bbbb:cccc:dddd')).toBe('2a02:a31a:1234:5678');
    expect(networkKey('2a02:a31a::1')).toBe('2a02:a31a:0:0');
  });

  it('zwraca null bez adresu', () => {
    expect(networkKey(undefined)).toBeNull();
    expect(networkKey('')).toBeNull();
  });
});

describe('buildMatchKey', () => {
  it('daje ten sam klucz dla tego samego urządzenia w tej samej sieci', () => {
    const a = buildMatchKey('secret', '2a02:a31a:1234:5678:1:2:3:4', 'ios|390x844@3|Europe/Warsaw|pl');
    const b = buildMatchKey('secret', '2a02:a31a:1234:5678:9:9:9:9', 'ios|390x844@3|Europe/Warsaw|pl');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rozróżnia inne urządzenie i inną sieć', () => {
    const base = buildMatchKey('secret', '91.227.218.143', 'ios|390x844@3|Europe/Warsaw|pl');
    expect(buildMatchKey('secret', '91.227.218.143', 'ios|430x932@3|Europe/Warsaw|pl')).not.toBe(base);
    expect(buildMatchKey('secret', '91.227.218.144', 'ios|390x844@3|Europe/Warsaw|pl')).not.toBe(base);
  });

  it('nie buduje klucza bez adresu sieciowego', () => {
    expect(buildMatchKey('secret', undefined, 'ios|390x844@3|Europe/Warsaw|pl')).toBeNull();
  });
});
