// filepath: apps/server/src/modules/metamorphoses/metamorphoses.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export const getAllMetamorphoses = async () => {
  return await prisma.metamorphosis.findMany({
    orderBy: { createdAt: 'desc' },
    include: { service: true }
  });
};

export const createMetamorphosis = async (data: any) => {
  return await prisma.metamorphosis.create({
    data
  });
};

export const deleteMetamorphosis = async (id: string) => {
  return await prisma.metamorphosis.delete({ where: { id } });
};
