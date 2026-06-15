import { api } from '@/lib/axios';

const happyHoursApi = {
  getActive: () => api.get('/happy-hours/active').then((r: any) => r.data),
  getAll: () => api.get('/happy-hours').then((r: any) => r.data),
  create: (data: any) => api.post('/happy-hours', data).then((r: any) => r.data),
  update: (id: string, data: any) => api.patch(`/happy-hours/${id}`, data).then((r: any) => r.data),
  remove: (id: string) => api.delete(`/happy-hours/${id}`).then((r: any) => r.data),
  toggle: (id: string) => api.patch(`/happy-hours/${id}/toggle`).then((r: any) => r.data),
};

export default happyHoursApi;
