import { prisma } from '../../config/prisma';

const SERVICE_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  category: true,
} as const;

export const buildOrderedSlides = <T extends { order: number }>(slides: T[]): T[] =>
  [...slides].sort((a, b) => a.order - b.order);

export const getActiveSlides = async () => {
  const slides = await prisma.recommendedSlide.findMany({
    where: { isActive: true },
    include: { service: { select: SERVICE_SELECT } },
    orderBy: { order: 'asc' },
  });
  return slides;
};

export const getAllSlides = async () => {
  return prisma.recommendedSlide.findMany({
    include: { service: { select: SERVICE_SELECT } },
    orderBy: { order: 'asc' },
  });
};

export const createSlide = async (data: {
  serviceId: string;
  description: string;
  imagePath: string;
}) => {
  const count = await prisma.recommendedSlide.count();
  return prisma.recommendedSlide.create({
    data: { ...data, order: count },
    include: { service: { select: SERVICE_SELECT } },
  });
};

export const updateSlide = async (
  id: string,
  data: { description?: string; isActive?: boolean; order?: number }
) => {
  return prisma.recommendedSlide.update({
    where: { id },
    data,
    include: { service: { select: SERVICE_SELECT } },
  });
};

export const deleteSlide = async (id: string) => {
  return prisma.recommendedSlide.delete({ where: { id } });
};
