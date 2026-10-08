import { api } from '../lib/axios';

export const appHandoffApi = {
  save: (path: string, device: string) =>
    api.post('/app-handoff', { path, device }).then((r) => r.data),
  claim: (device: string): Promise<string | null> =>
    api.post('/app-handoff/claim', { device }).then((r) => r.data.data.path ?? null),
};
