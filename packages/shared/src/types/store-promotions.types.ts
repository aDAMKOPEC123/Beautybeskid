export interface StorePromotion {
  id: string;
  storeName: string;
  title: string;
  description: string;
  conditions: string;
  discountValue: string;
  promoCode: string | null;
  link: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorePromotionInput {
  storeName: string;
  title: string;
  description: string;
  conditions?: string;
  discountValue: string;
  promoCode?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  isFeatured?: boolean;
}
