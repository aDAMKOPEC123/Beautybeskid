import { api } from '@/lib/axios';
import type { StorePromotion, StorePromotionEventType, StorePromotionInput } from '@cosmo/shared';

export const storePromotionsApi = {
  getActive: async (): Promise<StorePromotion[]> => {
    const response = await api.get('/store-promotions/active');
    return response.data.data.promotions;
  },

  getActiveCount: async (): Promise<number> => {
    const response = await api.get('/store-promotions/active/count');
    return response.data.data.count;
  },

  getAll: async (): Promise<StorePromotion[]> => {
    const response = await api.get('/store-promotions');
    return response.data.data.promotions;
  },

  create: async (data: StorePromotionInput): Promise<StorePromotion> => {
    const response = await api.post('/store-promotions', data);
    return response.data.data.promotion;
  },

  update: async (id: string, data: Partial<StorePromotionInput>): Promise<StorePromotion> => {
    const response = await api.patch(`/store-promotions/${id}`, data);
    return response.data.data.promotion;
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/store-promotions/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.imageUrl;
  },

  duplicate: async (id: string): Promise<StorePromotion> => {
    const response = await api.post(`/store-promotions/${id}/duplicate`);
    return response.data.data.promotion;
  },

  remove: (id: string) => api.delete(`/store-promotions/${id}`),

  setActive: async (id: string, isActive: boolean): Promise<StorePromotion> => {
    const response = await api.patch(`/store-promotions/${id}/active`, { isActive });
    return response.data.data.promotion;
  },

  setFeatured: async (id: string, isFeatured: boolean): Promise<StorePromotion> => {
    const response = await api.patch(`/store-promotions/${id}/featured`, { isFeatured });
    return response.data.data.promotion;
  },

  trackEvent: (id: string, type: Extract<StorePromotionEventType, 'VIEW' | 'CLICK' | 'COPY_CODE'>): Promise<void> =>
    api.post(`/store-promotions/${id}/events`, { type }).then(() => undefined),

  save: (id: string): Promise<void> =>
    api.post(`/store-promotions/${id}/favorite`).then(() => undefined),

  unsave: (id: string): Promise<void> =>
    api.delete(`/store-promotions/${id}/favorite`).then(() => undefined),

  setReminder: (id: string): Promise<void> =>
    api.post(`/store-promotions/${id}/reminder`).then(() => undefined),

  removeReminder: (id: string): Promise<void> =>
    api.delete(`/store-promotions/${id}/reminder`).then(() => undefined),
};
