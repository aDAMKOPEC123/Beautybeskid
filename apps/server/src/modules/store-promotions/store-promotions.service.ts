import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getActivePromotionsWhere } from './store-promotions.filters';

export interface StorePromotionData {
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

const cleanOptional = (value: string | null | undefined) => value?.trim() || null;

export const getActivePromotions = () => prisma.storePromotion.findMany({
  where: getActivePromotionsWhere(),
  orderBy: [{ isFeatured: 'desc' }, { endDate: 'asc' }, { createdAt: 'desc' }],
});

export const countActivePromotions = () => prisma.storePromotion.count({
  where: getActivePromotionsWhere(),
});

export const getAllPromotions = () => prisma.storePromotion.findMany({
  orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
});

export const createPromotion = (data: StorePromotionData) => prisma.storePromotion.create({
  data: {
    storeName: data.storeName.trim(),
    title: data.title.trim(),
    description: data.description.trim(),
    conditions: data.conditions?.trim() ?? '',
    discountValue: data.discountValue.trim(),
    promoCode: cleanOptional(data.promoCode),
    link: cleanOptional(data.link),
    imageUrl: cleanOptional(data.imageUrl),
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isActive: data.isActive ?? true,
    isFeatured: data.isFeatured ?? false,
  },
});

export const updatePromotion = async (id: string, data: Partial<StorePromotionData>) => {
  const existing = await prisma.storePromotion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);

  const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
  if (endDate < startDate) {
    throw new AppError('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia', 400);
  }

  return prisma.storePromotion.update({
    where: { id },
    data: {
      ...(data.storeName !== undefined && { storeName: data.storeName.trim() }),
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.conditions !== undefined && { conditions: data.conditions.trim() }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue.trim() }),
      ...(data.promoCode !== undefined && { promoCode: cleanOptional(data.promoCode) }),
      ...(data.link !== undefined && { link: cleanOptional(data.link) }),
      ...(data.imageUrl !== undefined && { imageUrl: cleanOptional(data.imageUrl) }),
      ...(data.startDate !== undefined && { startDate }),
      ...(data.endDate !== undefined && { endDate }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
    },
  });
};

export const deletePromotion = async (id: string) => {
  const existing = await prisma.storePromotion.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);
  await prisma.storePromotion.delete({ where: { id } });
};

export const setPromotionActive = (id: string, isActive: boolean) =>
  updatePromotion(id, { isActive });

export const setPromotionFeatured = (id: string, isFeatured: boolean) =>
  updatePromotion(id, { isFeatured });
