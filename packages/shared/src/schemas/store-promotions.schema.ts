import { z } from 'zod';

const optionalUrl = z.union([
  z.string().trim().url('Podaj poprawny adres URL'),
  z.literal(''),
  z.null(),
]).optional();

const promotionFields = {
  storeName: z.string().trim().min(1, 'Nazwa sklepu jest wymagana').max(120),
  brand: z.union([z.string().trim().max(120), z.null()]).optional(),
  category: z.union([z.string().trim().max(80), z.null()]).optional(),
  title: z.string().trim().min(1, 'Tytuł jest wymagany').max(180),
  description: z.string().trim().min(1, 'Opis jest wymagany').max(3000),
  conditions: z.string().trim().max(3000).default(''),
  discountValue: z.string().trim().min(1, 'Wartość promocji jest wymagana').max(80),
  promoCode: z.union([z.string().trim().max(80), z.null()]).optional(),
  link: optionalUrl,
  imageUrl: optionalUrl,
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  targetLoyaltyTiers: z.array(z.enum(['BRONZE', 'SILVER', 'GOLD'])).max(3).default([]),
  targetSkinTypes: z.array(z.enum(['SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA'])).max(5).default([]),
  targetConcerns: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  startDate: z.string().datetime('Nieprawidłowa data rozpoczęcia'),
  endDate: z.string().datetime('Nieprawidłowa data zakończenia'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  notifyClients: z.boolean().default(false),
  notificationTitle: z.string().trim().max(120).optional(),
  notificationBody: z.string().trim().max(240).optional(),
};

export const createStorePromotionSchema = z.object(promotionFields).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia', path: ['endDate'] },
);

export const updateStorePromotionSchema = z.object(promotionFields).partial();

export const promotionActiveSchema = z.object({ isActive: z.boolean() });
export const promotionFeaturedSchema = z.object({ isFeatured: z.boolean() });
export const promotionEventSchema = z.object({
  type: z.enum(['VIEW', 'CLICK', 'COPY_CODE']),
});
