// filepath: apps/server/src/modules/services/services.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { CreateServiceInput, UpdateServiceInput } from '@cosmo/shared';
import { createSlug } from '../../utils/slug';

const employeeSelect = { select: { id: true, name: true, avatarPath: true } };

export const getAllServices = async () => {
  const [services, reviewAggregates] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: { employees: employeeSelect },
    }),
    prisma.review.groupBy({
      by: ['serviceId'],
      where: { isVisible: true },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const aggregateMap = new Map(
    reviewAggregates.map((a) => [a.serviceId, { avgRating: a._avg.rating, reviewCount: a._count }])
  );

  return services.map((s) => ({
    ...s,
    avgRating: aggregateMap.get(s.id)?.avgRating ?? null,
    reviewCount: aggregateMap.get(s.id)?.reviewCount ?? 0,
  }));
};

export const getServiceBySlug = async (slug: string) => {
  const service = await prisma.service.findUnique({
    where: { slug },
    include: { employees: employeeSelect },
  });
  if (!service) throw new AppError('Usługa nie znaleziona', 404);

  const aggregate = await prisma.review.aggregate({
    where: { serviceId: service.id, isVisible: true },
    _avg: { rating: true },
    _count: true,
  });

  return {
    ...service,
    avgRating: aggregate._avg.rating,
    reviewCount: aggregate._count,
  };
};

export const createService = async (data: CreateServiceInput) => {
  let slug = createSlug(data.name);
  const existing = await prisma.service.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { employeeIds, ...rest } = data;
  return await prisma.$transaction(async (tx) => {
    const occupiedPosition = await tx.service.findFirst({
      where: { displayOrder: data.displayOrder },
      select: { id: true },
    });

    if (occupiedPosition) {
      const lastPosition = await tx.service.aggregate({ _max: { displayOrder: true } });
      await tx.service.update({
        where: { id: occupiedPosition.id },
        data: { displayOrder: (lastPosition._max.displayOrder ?? 0) + 1 },
      });
    }

    return tx.service.create({
      data: {
        ...rest,
        slug,
        ...(employeeIds?.length ? { employees: { connect: employeeIds.map((id) => ({ id })) } } : {}),
      },
      include: { employees: employeeSelect },
    });
  });
};

export const updateService = async (id: string, data: UpdateServiceInput) => {
  let slug;
  if (data.name) {
    slug = createSlug(data.name);
  }

  if (slug) {
    const existing = await prisma.service.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }
  }

  const { employeeIds, ...rest } = data;
  const updateData = {
    ...rest,
    ...(slug && { slug }),
    ...(employeeIds !== undefined
      ? { employees: { set: employeeIds.map((eid) => ({ id: eid })) } }
      : {}),
  };

  return await prisma.$transaction(async (tx) => {
    if (data.displayOrder !== undefined) {
      const currentService = await tx.service.findUnique({
        where: { id },
        select: { displayOrder: true },
      });
      if (!currentService) throw new AppError('UsĹ‚uga nie znaleziona', 404);

      if (currentService.displayOrder !== data.displayOrder) {
        const occupiedPosition = await tx.service.findFirst({
          where: { displayOrder: data.displayOrder, id: { not: id } },
          select: { id: true },
        });

        if (occupiedPosition) {
          const lastPosition = await tx.service.aggregate({ _max: { displayOrder: true } });
          await tx.service.update({ where: { id }, data: { displayOrder: 0 } });
          await tx.service.update({
            where: { id: occupiedPosition.id },
            data: { displayOrder: (lastPosition._max.displayOrder ?? 0) + 1 },
          });
        }
      }
    }

    return tx.service.update({
      where: { id },
      data: updateData,
      include: { employees: employeeSelect },
    });
  });
};

export const updateServiceImage = async (id: string, imagePath: string) => {
  return await prisma.service.update({
    where: { id },
    data: { imagePath },
    include: { employees: employeeSelect },
  });
};

export const deleteService = async (id: string) => {
  return await prisma.service.delete({ where: { id } });
};
