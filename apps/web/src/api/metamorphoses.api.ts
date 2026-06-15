// filepath: apps/web/src/api/metamorphoses.api.ts
import { api } from '../lib/axios';

export const metamorphosesApi = {
  getAll: async () => {
    const res = await api.get('/metamorphoses');
    return res.data.data.metamorphoses;
  },
  create: async (formData: FormData) => {
    const res = await api.post('/metamorphoses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data.metamorphosis;
  },
  remove: async (id: string) => {
    await api.delete(`/metamorphoses/${id}`);
  }
};
