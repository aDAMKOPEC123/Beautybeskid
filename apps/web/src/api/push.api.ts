import { api } from '@/lib/axios';

export const pushApi = {
  getVapidKey: (): Promise<string> =>
    api.get('/push/vapid-key').then((r) => r.data.publicKey),

  subscribe: (sub: object) => api.post('/push/subscribe', sub),

  unsubscribe: (endpoint: string) =>
    api.delete('/push/unsubscribe', { data: { endpoint } }),
};
