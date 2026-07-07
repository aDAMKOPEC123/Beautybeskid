export type StorePromotionLoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type StorePromotionSkinType = 'SUCHA' | 'TLUSTA' | 'MIESZANA' | 'NORMALNA' | 'WRAZLIWA';
export type StorePromotionEventType = 'VIEW' | 'CLICK' | 'COPY_CODE' | 'SAVE' | 'UNSAVE' | 'REMINDER_SET';

export interface StorePromotion {
  id: string;
  storeName: string;
  brand: string | null;
  category: string | null;
  title: string;
  description: string;
  conditions: string;
  discountValue: string;
  promoCode: string | null;
  link: string | null;
  imageUrl: string | null;
  tags: string[];
  targetLoyaltyTiers: StorePromotionLoyaltyTier[];
  targetSkinTypes: StorePromotionSkinType[];
  targetConcerns: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  clickCount: number;
  copyCount: number;
  saveCount: number;
  isSaved?: boolean;
  hasReminder?: boolean;
  reminderAt?: string | null;
  matchingRecipientsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorePromotionInput {
  storeName: string;
  brand?: string | null;
  category?: string | null;
  title: string;
  description: string;
  conditions?: string;
  discountValue: string;
  promoCode?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  targetLoyaltyTiers?: StorePromotionLoyaltyTier[];
  targetSkinTypes?: StorePromotionSkinType[];
  targetConcerns?: string[];
  startDate: string;
  endDate: string;
  isActive?: boolean;
  isFeatured?: boolean;
  notifyClients?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
}
