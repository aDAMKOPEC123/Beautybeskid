import { describe, it, expect, beforeEach, vi } from 'vitest';

// Vitest działa tu w środowisku 'node', które nie zna localStorage.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => {
    store.clear();
  },
});

import { getDeviceToken, setDeviceToken, clearDeviceToken } from './device-token';

describe('device-token', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('zwraca null, gdy nic nie zapisano', () => {
    expect(getDeviceToken()).toBeNull();
  });

  it('zapisuje i odczytuje token', () => {
    setDeviceToken('abc123');
    expect(getDeviceToken()).toBe('abc123');
  });

  it('kasuje token', () => {
    setDeviceToken('abc123');
    clearDeviceToken();
    expect(getDeviceToken()).toBeNull();
  });
});
