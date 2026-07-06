// filepath: apps/web/src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

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

  return api
    .post('/auth/refresh', {}, { withCredentials: true })
    .then(async ({ data }) => {
      const newToken: string = data.data.accessToken;
      useAuthStore.getState().setAccessToken(newToken);
      if (data.data.user) {
        useAuthStore.getState().setUser(data.data.user);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

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

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshSession();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
