import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { generateCode } from '../../utils/generateCode';

export const getAllCodes = async () => {
  return await prisma.discountCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { usages: true } } },
  });
};

export const createCode = async (data: { code: string; discountType: 'PERCENTAGE' | 'AMOUNT'; discountValue: number; isMultiUse?: boolean }) => {
  if (!data.code.trim()) throw new AppError('Kod rabatowy nie może być pusty', 400);
  if (data.discountValue <= 0) throw new AppError('Wartość rabatu musi być większa od zera', 400);
  if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
    throw new AppError('Rabat procentowy nie może przekraczać 100%', 400);
  }
  const code = data.code.trim().toUpperCase();
  return await prisma.discountCode.create({
    data: {
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      isMultiUse: data.isMultiUse ?? false,
    },
  });
};

export const toggleCode = async (id: string, isActive: boolean) => {
  return await prisma.discountCode.update({
    where: { id },
    data: { isActive },
  });
};

export const deactivateCode = async (id: string) => {
  return await prisma.discountCode.update({
    where: { id },
    data: { isActive: false },
  });
};

export const validateCode = async (code: string, userId: string) => {
  const normalized = code.trim().toUpperCase();
  const discountCode = await prisma.discountCode.findUnique({ where: { code: normalized } });

  if (!discountCode) throw new AppError('Nieprawidłowy kod rabatowy', 400);
  if (!discountCode.isActive) throw new AppError('Ten kod rabatowy jest nieaktywny', 400);
  if (discountCode.lockedToUserId && discountCode.lockedToUserId !== userId) {
    throw new AppError('Ten kod rabatowy nie jest przeznaczony dla Ciebie', 403);
  }

  if (!discountCode.isMultiUse) {
    const existingUsage = await prisma.discountCodeUsage.findFirst({
      where: { discountCodeId: discountCode.id, userId },
    });
    if (existingUsage) throw new AppError('Już użyłeś tego kodu rabatowego', 400);
  }

  return {
    id: discountCode.id,
    code: discountCode.code,
    discountType: discountCode.discountType as 'PERCENTAGE' | 'AMOUNT',
    discountValue: Number(discountCode.discountValue),
  };
};

export const getWelcomeCoupon = async (userId: string) => {
  const code = await prisma.discountCode.findFirst({
    where: {
      lockedToUserId: userId,
      isActive: true,
      usages: { none: {} },
    },
  });
  if (!code) return null;
  return {
    code: code.code,
    discountType: code.discountType as 'PERCENTAGE' | 'AMOUNT',
    discountValue: Number(code.discountValue),
  };
};

export const getAmbassadorConfig = async () => {
  const existing = await prisma.ambassadorConfig.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.ambassadorConfig.create({
    data: { id: 'singleton', discountType: 'PERCENTAGE', discountValue: 10, referrerDiscountType: 'PERCENTAGE', referrerDiscountValue: 10 },
  });
};

export const getReferralBenefits = async () => {
  const config = await getAmbassadorConfig();
  return {
    newUserDiscountType: config.discountType as 'PERCENTAGE' | 'AMOUNT',
    newUserDiscountValue: Number(config.discountValue),
    referrerDiscountType: config.referrerDiscountType as 'PERCENTAGE' | 'AMOUNT',
    referrerDiscountValue: Number(config.referrerDiscountValue),
  };
};

export const updateAmbassadorConfig = async (data: { discountType: 'PERCENTAGE' | 'AMOUNT'; discountValue: number; referrerDiscountType: 'PERCENTAGE' | 'AMOUNT'; referrerDiscountValue: number }) => {
  return await prisma.ambassadorConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  });
};

export const createWelcomeCodeForUser = async (
  tx: Prisma.TransactionClient,
  newUserId: string,
  referrerId: string
) => {
  const config = await tx.ambassadorConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', discountType: 'PERCENTAGE', discountValue: 10, referrerDiscountType: 'PERCENTAGE', referrerDiscountValue: 10 },
    update: {},
  });

  let welcomeCode = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode(8);
    const existing = await tx.discountCode.findUnique({ where: { code: candidate } });
    if (!existing) { welcomeCode = candidate; break; }
  }
  if (!welcomeCode) throw new AppError('Nie udało się wygenerować kodu rabatowego', 500);

  await tx.discountCode.create({
    data: {
      code: welcomeCode,
      discountType: config.discountType,
      discountValue: config.discountValue,
      lockedToUserId: newUserId,
    },
  });

  let referrerCode = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode(8);
    const existing = await tx.discountCode.findUnique({ where: { code: candidate } });
    if (!existing) { referrerCode = candidate; break; }
  }
  if (!referrerCode) throw new AppError('Nie udało się wygenerować kodu polecającego', 500);

  await tx.discountCode.create({
    data: {
      code: referrerCode,
      discountType: config.referrerDiscountType,
      discountValue: config.referrerDiscountValue,
      lockedToUserId: referrerId,
    },
  });

  await tx.user.update({
    where: { id: referrerId },
    data: { referralCount: { increment: 1 } },
  });
};
