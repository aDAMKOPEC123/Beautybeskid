export interface DiscountCode {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
  isActive: boolean;
  isMultiUse: boolean;
  lockedToUserId?: string | null;
  createdAt: Date;
  _count?: { usages: number };
}

export interface ValidatedDiscountCode {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
}

export interface AmbassadorConfig {
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
  referrerDiscountType: 'PERCENTAGE' | 'AMOUNT';
  referrerDiscountValue: number;
}

export interface ValidatedVoucher {
  type: 'COUPON' | 'DISCOUNT_CODE' | 'VOUCHER_CASH';
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
  restrictedToServiceId?: string | null;
}
