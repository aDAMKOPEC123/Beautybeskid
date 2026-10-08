import { describe, expect, it } from 'vitest';
import {
  androidIntentUrl,
  buildDeviceKey,
  detectHandoffBrowser,
  safeHandoffPath,
  shouldOfferHandoff,
} from './appHandoff';

const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_MESSENGER =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 [FBAN/MessengerForiOS;FBAV/460.0.0;FBDV/iPhone14,5;FBSN/iOS;FBSV/17.5;FBLC/pl_PL]';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const ANDROID_MESSENGER =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/460.0.0.48.109;]';
const ANDROID_INSTAGRAM =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.40.92 Android';
const DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

describe('detectHandoffBrowser', () => {
  it('rozpoznaje system i przeglądarkę wbudowaną w aplikację', () => {
    expect(detectHandoffBrowser(IOS_SAFARI)).toEqual({ os: 'ios', inApp: false });
    expect(detectHandoffBrowser(IOS_MESSENGER)).toEqual({ os: 'ios', inApp: true });
    expect(detectHandoffBrowser(ANDROID_CHROME)).toEqual({ os: 'android', inApp: false });
    expect(detectHandoffBrowser(ANDROID_MESSENGER)).toEqual({ os: 'android', inApp: true });
    expect(detectHandoffBrowser(ANDROID_INSTAGRAM)).toEqual({ os: 'android', inApp: true });
    expect(detectHandoffBrowser(DESKTOP)).toEqual({ os: null, inApp: false });
  });
});

describe('shouldOfferHandoff', () => {
  const base = { standalone: false, entryPath: '/user/wizyty', path: '/user/wizyty', dismissed: false };

  it('proponuje aplikację na iPhonie w każdej przeglądarce', () => {
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_SAFARI })).toBe(true);
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_MESSENGER })).toBe(true);
  });

  it('na Androidzie proponuje tylko w przeglądarce wbudowanej — Chrome sam otwiera PWA', () => {
    expect(shouldOfferHandoff({ ...base, userAgent: ANDROID_MESSENGER })).toBe(true);
    expect(shouldOfferHandoff({ ...base, userAgent: ANDROID_CHROME })).toBe(false);
  });

  it('nie proponuje na komputerze, w samej aplikacji ani po odrzuceniu', () => {
    expect(shouldOfferHandoff({ ...base, userAgent: DESKTOP })).toBe(false);
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_MESSENGER, standalone: true })).toBe(false);
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_MESSENGER, dismissed: true })).toBe(false);
  });

  it('proponuje tylko dla linku, z którego ktoś wszedł, nie dla klikania po stronie', () => {
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_SAFARI, entryPath: '/' })).toBe(false);
    expect(shouldOfferHandoff({ ...base, userAgent: IOS_SAFARI, entryPath: '/user/wizyty?x=1', path: '/user/wizyty?x=1' })).toBe(true);
  });
});

describe('buildDeviceKey', () => {
  const screen = { width: 390, height: 844, pixelRatio: 3, timeZone: 'Europe/Warsaw', language: 'pl-PL' };

  it('jest taki sam w przeglądarce Messengera i w PWA na tym samym telefonie', () => {
    expect(buildDeviceKey({ ...screen, userAgent: IOS_MESSENGER })).toBe(
      buildDeviceKey({ ...screen, userAgent: IOS_SAFARI }),
    );
    expect(buildDeviceKey({ ...screen, userAgent: IOS_SAFARI })).toBe('ios|390x844@3|Europe/Warsaw|pl');
  });

  it('nie zależy od obrotu ekranu', () => {
    expect(buildDeviceKey({ ...screen, width: 844, height: 390, userAgent: IOS_SAFARI })).toBe(
      buildDeviceKey({ ...screen, userAgent: IOS_SAFARI }),
    );
  });

  it('rozróżnia inny model telefonu', () => {
    expect(buildDeviceKey({ ...screen, width: 430, height: 932, userAgent: IOS_SAFARI })).not.toBe(
      buildDeviceKey({ ...screen, userAgent: IOS_SAFARI }),
    );
  });
});

describe('safeHandoffPath', () => {
  it('przepuszcza tylko ścieżki wewnątrz aplikacji', () => {
    expect(safeHandoffPath('/user/wizyty?tab=1')).toBe('/user/wizyty?tab=1');
    expect(safeHandoffPath('//evil.example')).toBeNull();
    expect(safeHandoffPath('https://evil.example')).toBeNull();
    expect(safeHandoffPath('/\\evil.example')).toBeNull();
    expect(safeHandoffPath(null)).toBeNull();
  });
});

describe('androidIntentUrl', () => {
  it('buduje link otwierający tę samą podstronę poza przeglądarką wbudowaną', () => {
    expect(androidIntentUrl('https://kosmetologwiktoriacwik.pl', '/user/wizyty?tab=1')).toBe(
      'intent://kosmetologwiktoriacwik.pl/user/wizyty?tab=1#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=https%3A%2F%2Fkosmetologwiktoriacwik.pl%2Fuser%2Fwizyty%3Ftab%3D1;end',
    );
  });
});
