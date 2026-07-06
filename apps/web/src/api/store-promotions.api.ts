import { api } from '@/lib/axios';
import type { StorePromotion, StorePromotionInput } from '@cosmo/shared';

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

  remove: (id: string) => api.delete(`/store-promotions/${id}`),

  setActive: async (id: string, isActive: boolean): Promise<StorePromotion> => {
    const response = await api.patch(`/store-promotions/${id}/active`, { isActive });
    return response.data.data.promotion;
  },

  setFeatured: async (id: string, isFeatured: boolean): Promise<StorePromotion> => {
    const response = await api.patch(`/store-promotions/${id}/featured`, { isFeatured });
    return response.data.data.promotion;
  },
};
