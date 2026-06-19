import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

export const grantAccess = async (userId: string, adminId: string, expiresAt?: Date) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Nie znaleziono użytkownika', 404);

  await prisma.user.update({
    where: { id: userId },
    data: {
      hasAcademyAccess: true,
      academyAccessExpiresAt: expiresAt ?? null,
      academyGrantedById: adminId,
      academyGrantedAt: new Date(),
    },
  });

  await prisma.academyAccessLog.create({
    data: {
      userId,
      adminId,
      action: 'GRANTED',
      expiresAt: expiresAt ?? null,
    },
  });
};

export const revokeAccess = async (userId: string, adminId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Nie znaleziono użytkownika', 404);

  await prisma.user.update({
    where: { id: userId },
    data: {
      hasAcademyAccess: false,
      academyAccessExpiresAt: null,
    },
  });

  await prisma.academyAccessLog.create({
    data: {
      userId,
      adminId,
      action: 'REVOKED',
    },
  });
};

export const getAccessLog = async (userId: string) => {
  return prisma.academyAccessLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};
