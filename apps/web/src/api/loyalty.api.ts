// filepath: apps/web/src/api/loyalty.api.ts
import { api } from '../lib/axios';
import type { ValidatedVoucher } from '@cosmo/shared';

export const loyaltyApi = {
  getRewards: async () => {
    const res = await api.get('/loyalty/rewards');
    return res.data.data.rewards;
  },
  getHistory: async () => {
    const res = await api.get('/loyalty/history');
    return res.data.data.history;
  },
  redeem: async (rewardId: string) => {
    const res = await api.post('/loyalty/redeem', { rewardId });
    return res.data.data.coupon;
  },
  getActiveCoupons: async () => {
    const res = await api.get('/loyalty/coupons');
    return res.data.data.coupons;
  },
  useCoupon: async (couponId: string) => {
    const res = await api.post(`/loyalty/coupons/${couponId}/use`);
    return res.data.data.coupon;
  },
  adjust: async (data: { userId: string, points: number, type: string, description: string }) => {
    const res = await api.post('/loyalty/adjust', data);
    return res.data.data.result;
  },
  createReward: async (data: {
    name: string;
    description?: string;
    pointsCost: number;
    requiredTier?: string;
    isForAllServices: boolean;
    applicableServiceIds?: string[];
    discountType: 'PERCENTAGE' | 'AMOUNT' | 'OTHER';
    discountValue?: number;
  }) => {
    const res = await api.post('/loyalty/rewards', data);
    return res.data.data.reward;
  },
  deleteReward: async (id: string) => {
    await api.delete(`/loyalty/rewards/${id}`);
  },
  getStats: async (): Promise<{ completedVisits: number }> => {
    const res = await api.get('/loyalty/stats');
    return res.data.data.stats;
  },
  validateVoucher: async (code: string): Promise<ValidatedVoucher> => {
    const res = await api.get('/loyalty/vouchers/validate', { params: { code } });
    return res.data.data.voucher;
  },
};
