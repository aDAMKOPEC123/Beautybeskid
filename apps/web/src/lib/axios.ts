// filepath: apps/web/src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { getDeviceToken, setDeviceToken } from './device-token';
import type { User } from '@cosmo/shared';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

type Subscriber = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshSubscribers: Subscriber[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(s => s.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: unknown) {
  refreshSubscribers.forEach(s => s.reject(err));
  refreshSubscribers = [];
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (err: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}

function isUnauthorizedRefreshFailure(err: unknown) {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

async function ensureDeviceToken() {
  if (getDeviceToken()) return;
  try {
    const { data } = await api.post('/auth/device-token', {}, { withCredentials: true });
    if (data?.data?.deviceToken) setDeviceToken(data.data.deviceToken);
  } catch {
    // Brak tokenu urządzenia nie jest błędem krytycznym — sesja działa na ciasteczku.
  }
}

async function requestRefresh(): Promise<{ accessToken: string; user?: User }> {
  try {
    const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });
    return data.data;
  } catch (err) {
    // Ciasteczko zniknęło lub wygasło — spróbuj tokenu urządzenia.
    const deviceToken = getDeviceToken();
    if (!isUnauthorizedRefreshFailure(err) || !deviceToken) throw err;

    const { data } = await api.post(
      '/auth/refresh-device',
      {},
      { withCredentials: true, headers: { 'X-Device-Token': deviceToken } },
    );
    if (data.data.deviceToken) setDeviceToken(data.data.deviceToken);
    return data.data;
  }
}

/**
 * Coordinated token refresh — single entry point used by both the
 * response interceptor (on 401) and the visibilitychange handler.
 * Guards against concurrent refresh calls that would invalidate
 * rotated tokens on the backend.
 */
export function refreshSession(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(resolve, reject);
    });
  }

  isRefreshing = true;

  return requestRefresh()
    .then(async (payload) => {
      const newToken: string = payload.accessToken;
      useAuthStore.getState().setAccessToken(newToken);
      if (payload.user) {
        useAuthStore.getState().setUser(payload.user);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      // Dobierz token urządzenia dopiero teraz — świeży access token jest już
      // w store, więc to żądanie nie dostanie 401 i nie zapętli się z powrotem
      // w refreshSession() (patrz komentarz w response interceptorze).
      await ensureDeviceToken();

      // Re-auth WebSocket with new token
      const { getSocket } = await import('./socket');
      const sock = getSocket();
      sock.auth = { token: newToken };
      if (sock.connected) {
        sock.disconnect();
        sock.connect();
      }

      onRefreshed(newToken);
      return newToken;
    })
    .catch((err) => {
      onRefreshFailed(err);
      throw err;
    })
    .finally(() => {
      isRefreshing = false;
    });
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const hasActiveSession = Boolean(useAuthStore.getState().accessToken);

    // /auth/device-token jest celowo wykluczony z ponawiania: to żądanie leci
    // z refreshSession() (przez ensureDeviceToken) i ewentualny 401 nie może
    // wywoływać kolejnego refreshSession() — doprowadziłoby to do zakleszczenia,
    // bo isRefreshing jest już true, a nowe wywołanie czekałoby w kolejce na
    // to samo, wciąż niezakończone odświeżenie.
    if (hasActiveSession && error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/device-token')) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshSession();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (isUnauthorizedRefreshFailure(refreshError)) {
          useAuthStore.getState().logout();
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
