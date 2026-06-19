import { api } from '../lib/axios';
import type { ValidatedDiscountCode, AmbassadorConfig, DiscountCode } from '@cosmo/shared';

export const discountCodesApi = {
  validate: (code: string): Promise<ValidatedDiscountCode> =>
    api.get('/discount-codes/validate', { params: { code } }).then(r => r.data.data.discountCode),

  getWelcomeCoupon: (): Promise<{ code: string; discountType: 'PERCENTAGE' | 'AMOUNT'; discountValue: number } | null> =>
    api.get('/discount-codes/welcome').then(r => r.data.data.coupon),

  getAll: (): Promise<DiscountCode[]> =>
    api.get('/discount-codes').then(r => r.data.data.codes),

  create: (data: { code: string; discountType: 'PERCENTAGE' | 'AMOUNT'; discountValue: number; isMultiUse: boolean }): Promise<DiscountCode> =>
    api.post('/discount-codes', data).then(r => r.data.data.code),

  toggle: (id: string, isActive: boolean): Promise<DiscountCode> =>
    api.patch(`/discount-codes/${id}/toggle`, { isActive }).then(r => r.data.data.code),

  remove: (id: string) =>
    api.delete(`/discount-codes/${id}`),

  getAmbassadorConfig: (): Promise<AmbassadorConfig> =>
    api.get('/discount-codes/ambassador-config').then(r => r.data.data.config),

  updateAmbassadorConfig: (data: AmbassadorConfig): Promise<AmbassadorConfig> =>
    api.put('/discount-codes/ambassador-config', data).then(r => r.data.data.config),

  getReferralBenefits: (): Promise<{ newUserDiscountType: 'PERCENTAGE' | 'AMOUNT'; newUserDiscountValue: number; referrerDiscountType: 'PERCENTAGE' | 'AMOUNT'; referrerDiscountValue: number }> =>
    api.get('/discount-codes/referral-benefits').then(r => r.data.data.benefits),
};
