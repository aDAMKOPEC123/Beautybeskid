import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { setDeviceToken, getDeviceToken } from './device-token';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({ post, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }, defaults: { headers: { common: {} } } }),
    isAxiosError: (e: any) => Boolean(e?.response),
  },
}));

vi.mock('./socket', () => ({ getSocket: () => ({ connected: false, auth: {} }) }));

describe('refreshSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it('sięga po token urządzenia dopiero po 401 z ciasteczka', async () => {
    setDeviceToken('device-abc');
    post.mockRejectedValueOnce({ response: { status: 401 } });
    post.mockResolvedValueOnce({ data: { data: { accessToken: 'nowy-token' } } });

    const { refreshSession } = await import('./axios');
    const token = await refreshSession();

    expect(token).toBe('nowy-token');
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0]).toBe('/auth/refresh-device');
  });

  it('odrzuca obietnicę, gdy brak tokenu urządzenia', async () => {
    post.mockRejectedValueOnce({ response: { status: 401 } });

    const { refreshSession } = await import('./axios');

    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 401 } });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('po udanym odświeżeniu ciasteczkiem dobiera token urządzenia, gdy lokalnie go brak', async () => {
    post.mockResolvedValueOnce({ data: { data: { accessToken: 'nowy-token' } } });
    post.mockResolvedValueOnce({ data: { data: { deviceToken: 'dev-1' } } });

    const { refreshSession } = await import('./axios');
    const token = await refreshSession();

    expect(token).toBe('nowy-token');
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toBe('/auth/refresh');
    expect(post.mock.calls[1][0]).toBe('/auth/device-token');
    expect(getDeviceToken()).toBe('dev-1');
  });
});
