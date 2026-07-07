import type { LoyaltyTier, SkinType, StorePromotion, StorePromotionEventType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUsers } from '../push/push.service';
import { getActivePromotionsWhere } from './store-promotions.filters';

export interface StorePromotionData {
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
  targetLoyaltyTiers?: LoyaltyTier[];
  targetSkinTypes?: SkinType[];
  targetConcerns?: string[];
  startDate: string;
  endDate: string;
  isActive?: boolean;
  isFeatured?: boolean;
  notifyClients?: boolean;
  notificationTitle?: string;
  notificationBody?: string;
}

type AudienceUser = {
  id: string;
  loyaltyTier: LoyaltyTier;
  marketingConsent?: boolean;
  skinWeatherProfile: {
    skinType: SkinType;
    skinConcerns: string[];
  } | null;
};

const PROMOTIONS_URL = '/user/promocje-sklepowe';

const cleanOptional = (value: string | null | undefined) => value?.trim() || null;

const cleanList = (values: string[] | undefined, limit = 20) =>
  Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean))).slice(0, limit);

const normalize = (value: string) => value.trim().toLocaleLowerCase('pl');

const matchesAnyNormalized = (targetValues: string[], userValues: string[]) => {
  if (targetValues.length === 0) return true;
  const normalizedUserValues = new Set(userValues.map(normalize));
  return targetValues.some((target) => normalizedUserValues.has(normalize(target)));
};

export const promotionMatchesUser = (
  promotion: Pick<StorePromotion, 'targetLoyaltyTiers' | 'targetSkinTypes' | 'targetConcerns'>,
  user: AudienceUser | null,
) => {
  if (!user) return false;

  if (promotion.targetLoyaltyTiers.length > 0 && !promotion.targetLoyaltyTiers.includes(user.loyaltyTier)) {
    return false;
  }

  if (promotion.targetSkinTypes.length > 0) {
    if (!user.skinWeatherProfile || !promotion.targetSkinTypes.includes(user.skinWeatherProfile.skinType)) {
      return false;
    }
  }

  if (promotion.targetConcerns.length > 0) {
    if (!user.skinWeatherProfile) return false;
    return matchesAnyNormalized(promotion.targetConcerns, user.skinWeatherProfile.skinConcerns);
  }

  return true;
};

const getAudienceUsers = (marketingOnly = false) =>
  prisma.user.findMany({
    where: {
      role: 'USER',
      ...(marketingOnly && { marketingConsent: true }),
    },
    select: {
      id: true,
      loyaltyTier: true,
      marketingConsent: true,
      skinWeatherProfile: {
        select: {
          skinType: true,
          skinConcerns: true,
        },
      },
    },
  });

const getViewer = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      loyaltyTier: true,
      skinWeatherProfile: {
        select: {
          skinType: true,
          skinConcerns: true,
        },
      },
    },
  });

const buildPromotionCreateData = (data: StorePromotionData, createdById?: string | null) => ({
  storeName: data.storeName.trim(),
  brand: cleanOptional(data.brand),
  category: cleanOptional(data.category),
  title: data.title.trim(),
  description: data.description.trim(),
  conditions: data.conditions?.trim() ?? '',
  discountValue: data.discountValue.trim(),
  promoCode: cleanOptional(data.promoCode),
  link: cleanOptional(data.link),
  imageUrl: cleanOptional(data.imageUrl),
  tags: cleanList(data.tags),
  targetLoyaltyTiers: data.targetLoyaltyTiers ?? [],
  targetSkinTypes: data.targetSkinTypes ?? [],
  targetConcerns: cleanList(data.targetConcerns),
  startDate: new Date(data.startDate),
  endDate: new Date(data.endDate),
  isActive: data.isActive ?? true,
  isFeatured: data.isFeatured ?? false,
  createdById: createdById ?? undefined,
});

const buildPromotionUpdateData = (data: Partial<StorePromotionData>) => ({
  ...(data.storeName !== undefined && { storeName: data.storeName.trim() }),
  ...(data.brand !== undefined && { brand: cleanOptional(data.brand) }),
  ...(data.category !== undefined && { category: cleanOptional(data.category) }),
  ...(data.title !== undefined && { title: data.title.trim() }),
  ...(data.description !== undefined && { description: data.description.trim() }),
  ...(data.conditions !== undefined && { conditions: data.conditions.trim() }),
  ...(data.discountValue !== undefined && { discountValue: data.discountValue.trim() }),
  ...(data.promoCode !== undefined && { promoCode: cleanOptional(data.promoCode) }),
  ...(data.link !== undefined && { link: cleanOptional(data.link) }),
  ...(data.imageUrl !== undefined && { imageUrl: cleanOptional(data.imageUrl) }),
  ...(data.tags !== undefined && { tags: cleanList(data.tags) }),
  ...(data.targetLoyaltyTiers !== undefined && { targetLoyaltyTiers: data.targetLoyaltyTiers }),
  ...(data.targetSkinTypes !== undefined && { targetSkinTypes: data.targetSkinTypes }),
  ...(data.targetConcerns !== undefined && { targetConcerns: cleanList(data.targetConcerns) }),
  ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
  ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
  ...(data.isActive !== undefined && { isActive: data.isActive }),
  ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
});

const getMatchingAudience = async (promotion: StorePromotion, marketingOnly = false) => {
  const users = await getAudienceUsers(marketingOnly);
  return users.filter((user) => promotionMatchesUser(promotion, user));
};

const notifyMatchingClients = async (
  promotion: StorePromotion,
  options?: { title?: string; body?: string },
) => {
  const recipients = await getMatchingAudience(promotion, true);
  if (recipients.length === 0) return 0;

  const title = options?.title || `Nowa promocja: ${promotion.storeName}`;
  const body = options?.body || `${promotion.title} — ${promotion.discountValue}. Sprawdź szczegóły w aplikacji.`;
  const io = getIO();

  await Promise.allSettled(
    recipients.map((user) =>
      createAndEmitNotification(io, {
        userId: user.id,
        type: 'BROADCAST',
        title,
        body,
        url: PROMOTIONS_URL,
      }),
    ),
  );

  await sendPushToUsers(recipients.map((user) => user.id), { title, body, url: PROMOTIONS_URL });
  return recipients.length;
};

const withAdminStats = async (promotions: StorePromotion[]) => {
  const users = await getAudienceUsers(false);
  return promotions.map((promotion) => ({
    ...promotion,
    matchingRecipientsCount: users.filter((user) => promotionMatchesUser(promotion, user)).length,
  }));
};

const withViewerState = <
  T extends StorePromotion & {
    favorites?: Array<{ id: string }>;
    reminders?: Array<{ remindAt: Date }>;
  },
>(promotion: T) => {
  const { favorites, reminders, ...rest } = promotion;
  return {
    ...rest,
    isSaved: Boolean(favorites?.length),
    hasReminder: Boolean(reminders?.length),
    reminderAt: reminders?.[0]?.remindAt ?? null,
  };
};

export const getActivePromotions = async (userId: string) => {
  const viewer = await getViewer(userId);
  const promotions = await prisma.storePromotion.findMany({
    where: getActivePromotionsWhere(),
    include: {
      favorites: { where: { userId }, select: { id: true } },
      reminders: { where: { userId }, select: { remindAt: true } },
    },
    orderBy: [{ isFeatured: 'desc' }, { endDate: 'asc' }, { createdAt: 'desc' }],
  });

  return promotions
    .filter((promotion) => promotionMatchesUser(promotion, viewer))
    .map(withViewerState);
};

export const countActivePromotions = async (userId: string) => {
  const promotions = await getActivePromotions(userId);
  return promotions.length;
};

export const getAllPromotions = async () => {
  const promotions = await prisma.storePromotion.findMany({
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });

  return withAdminStats(promotions);
};

export const createPromotion = async (data: StorePromotionData, createdById?: string) => {
  const promotion = await prisma.storePromotion.create({
    data: buildPromotionCreateData(data, createdById),
  });

  if (data.notifyClients) {
    await notifyMatchingClients(promotion, {
      title: data.notificationTitle,
      body: data.notificationBody,
    });
  }

  return promotion;
};

export const updatePromotion = async (id: string, data: Partial<StorePromotionData>) => {
  const existing = await prisma.storePromotion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);

  const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
  if (endDate < startDate) {
    throw new AppError('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia', 400);
  }

  const promotion = await prisma.storePromotion.update({
    where: { id },
    data: buildPromotionUpdateData(data),
  });

  if (data.notifyClients) {
    await notifyMatchingClients(promotion, {
      title: data.notificationTitle,
      body: data.notificationBody,
    });
  }

  return promotion;
};

export const duplicatePromotion = async (id: string, createdById?: string) => {
  const existing = await prisma.storePromotion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  return prisma.storePromotion.create({
    data: {
      storeName: existing.storeName,
      brand: existing.brand,
      category: existing.category,
      title: `${existing.title} (kopia)`,
      description: existing.description,
      conditions: existing.conditions,
      discountValue: existing.discountValue,
      promoCode: existing.promoCode,
      link: existing.link,
      imageUrl: existing.imageUrl,
      tags: existing.tags,
      targetLoyaltyTiers: existing.targetLoyaltyTiers,
      targetSkinTypes: existing.targetSkinTypes,
      targetConcerns: existing.targetConcerns,
      startDate,
      endDate,
      isActive: false,
      isFeatured: false,
      createdById,
    },
  });
};

export const uploadPromotionImage = async (file?: Express.Multer.File) => {
  if (!file) throw new AppError('Brak pliku grafiki', 400);
  return processAndSaveImage(file.buffer, 'store-promotions');
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

export const trackPromotionEvent = async (
  id: string,
  userId: string | undefined,
  type: Extract<StorePromotionEventType, 'VIEW' | 'CLICK' | 'COPY_CODE'>,
) => {
  const counterField = {
    VIEW: 'viewCount',
    CLICK: 'clickCount',
    COPY_CODE: 'copyCount',
  }[type] as 'viewCount' | 'clickCount' | 'copyCount';

  const existing = await prisma.storePromotion.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);

  await prisma.$transaction([
    prisma.storePromotionEvent.create({
      data: { promotionId: id, userId, type },
    }),
    prisma.storePromotion.update({
      where: { id },
      data: { [counterField]: { increment: 1 } },
    }),
  ]);
};

export const savePromotion = async (id: string, userId: string) => {
  const existing = await prisma.storePromotion.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError('Promocja nie została znaleziona', 404);

  const favorite = await prisma.storePromotionFavorite.findUnique({
    where: { promotionId_userId: { promotionId: id, userId } },
  });
  if (favorite) return favorite;

  const [created] = await prisma.$transaction([
    prisma.storePromotionFavorite.create({ data: { promotionId: id, userId } }),
    prisma.storePromotionEvent.create({ data: { promotionId: id, userId, type: 'SAVE' } }),
    prisma.storePromotion.update({ where: { id }, data: { saveCount: { increment: 1 } } }),
  ]);

  return created;
};

export const unsavePromotion = async (id: string, userId: string) => {
  const result = await prisma.storePromotionFavorite.deleteMany({
    where: { promotionId: id, userId },
  });

  if (result.count > 0) {
    await prisma.$transaction([
      prisma.storePromotionEvent.create({ data: { promotionId: id, userId, type: 'UNSAVE' } }),
      prisma.storePromotion.update({ where: { id }, data: { saveCount: { decrement: 1 } } }),
    ]);
  }
};

export const setPromotionReminder = async (id: string, userId: string) => {
  const promotion = await prisma.storePromotion.findUnique({ where: { id } });
  if (!promotion) throw new AppError('Promocja nie została znaleziona', 404);
  if (promotion.endDate < new Date()) throw new AppError('Promocja już się zakończyła', 400);

  const remindAt = new Date(promotion.endDate);
  remindAt.setDate(remindAt.getDate() - 1);
  if (remindAt < new Date()) remindAt.setTime(Date.now());

  const reminder = await prisma.storePromotionReminder.upsert({
    where: { promotionId_userId: { promotionId: id, userId } },
    update: { remindAt, sentAt: null },
    create: { promotionId: id, userId, remindAt },
  });

  await prisma.storePromotionEvent.create({ data: { promotionId: id, userId, type: 'REMINDER_SET' } });
  return reminder;
};

export const removePromotionReminder = async (id: string, userId: string) => {
  await prisma.storePromotionReminder.deleteMany({ where: { promotionId: id, userId } });
};

export const sendDuePromotionReminders = async () => {
  const now = new Date();
  const reminders = await prisma.storePromotionReminder.findMany({
    where: {
      sentAt: null,
      remindAt: { lte: now },
      promotion: {
        isActive: true,
        endDate: { gte: now },
      },
    },
    include: {
      promotion: true,
      user: { select: { id: true } },
    },
    take: 100,
  });

  if (reminders.length === 0) return 0;

  const io = getIO();
  let sent = 0;

  for (const reminder of reminders) {
    const title = `Promocja kończy się niedługo`;
    const body = `${reminder.promotion.storeName}: ${reminder.promotion.title} — ważna do końca promocji.`;

    try {
      await createAndEmitNotification(io, {
        userId: reminder.userId,
        type: 'BROADCAST',
        title,
        body,
        url: PROMOTIONS_URL,
      });
      await sendPushToUsers([reminder.userId], { title, body, url: PROMOTIONS_URL });
      await prisma.storePromotionReminder.update({
        where: { id: reminder.id },
        data: { sentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      console.error('Store promotion reminder failed:', error);
    }
  }

  return sent;
};

export const initializeStorePromotionReminderScheduler = () => {
  const runScheduler = async () => {
    try {
      await sendDuePromotionReminders();
    } catch (error) {
      console.error('Store promotion scheduler error:', error);
    }
  };

  runScheduler();
  setInterval(runScheduler, 3_600_000);
};
