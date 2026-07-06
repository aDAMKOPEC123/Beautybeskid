import { z } from 'zod';

const optionalUrl = z.union([
  z.string().trim().url('Podaj poprawny adres URL'),
  z.literal(''),
  z.null(),
]).optional();

const promotionFields = {
  storeName: z.string().trim().min(1, 'Nazwa sklepu jest wymagana').max(120),
  title: z.string().trim().min(1, 'Tytuł jest wymagany').max(180),
  description: z.string().trim().min(1, 'Opis jest wymagany').max(3000),
  conditions: z.string().trim().max(3000).default(''),
  discountValue: z.string().trim().min(1, 'Wartość promocji jest wymagana').max(80),
  promoCode: z.union([z.string().trim().max(80), z.null()]).optional(),
  link: optionalUrl,
  imageUrl: optionalUrl,
  startDate: z.string().datetime('Nieprawidłowa data rozpoczęcia'),
  endDate: z.string().datetime('Nieprawidłowa data zakończenia'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
};

export const createStorePromotionSchema = z.object(promotionFields).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia', path: ['endDate'] },
);

export const updateStorePromotionSchema = z.object(promotionFields).partial();

export const promotionActiveSchema = z.object({ isActive: z.boolean() });
export const promotionFeaturedSchema = z.object({ isFeatured: z.boolean() });
