// filepath: apps/server/src/modules/services/services.service.ts
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { CreateServiceInput, UpdateServiceInput } from '@cosmo/shared';
import { createSlug } from '../../utils/slug';

const employeeSelect = { select: { id: true, name: true, avatarPath: true } };

function computePromoPrice(service: {
  price: Decimal | number;
  promoDiscountType: string | null;
  promoDiscountValue: Decimal | number | null;
  promoStartDate: Date | null;
  promoEndDate: Date | null;
}): number | null {
  if (!service.promoDiscountType || !service.promoDiscountValue || !service.promoStartDate || !service.promoEndDate) {
    return null;
  }
  const now = new Date();
  if (now < service.promoStartDate || now > service.promoEndDate) {
    return null;
  }
  const price = Number(service.price);
  const discountValue = Number(service.promoDiscountValue);
  if (service.promoDiscountType === 'PERCENTAGE') {
    return Math.round(price * (1 - discountValue / 100) * 100) / 100;
  }
  return Math.round(Math.max(0, price - discountValue) * 100) / 100;
}

function computePromoUsesRemaining(service: {
  id: string;
  promoMaxUses: number | null;
  promoStartDate: Date | null;
  promoEndDate: Date | null;
  promoDiscountType: string | null;
}, promoUsageCount: number): number | null {
  if (service.promoMaxUses == null) return null;
  if (!service.promoDiscountType || !service.promoStartDate || !service.promoEndDate) return null;
  return Math.max(0, service.promoMaxUses - promoUsageCount);
}

async function getPromoUsageCounts(serviceIds: string[], services: Array<{ id: string; promoStartDate: Date | null; promoEndDate: Date | null; promoMaxUses: number | null }>): Promise<Map<string, number>> {
  const servicesWithLimits = services.filter(s => s.promoMaxUses != null && s.promoStartDate && s.promoEndDate);
  if (servicesWithLimits.length === 0) return new Map();

  const counts = await Promise.all(
    servicesWithLimits.map(async (s) => {
      const count = await prisma.appointment.count({
        where: {
          serviceId: s.id,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: s.promoStartDate!, lte: s.promoEndDate! },
        },
      });
      return { id: s.id, count };
    })
  );

  return new Map(counts.map(c => [c.id, c.count]));
}

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

  const usageCounts = await getPromoUsageCounts(
    services.map(s => s.id),
    services.map(s => ({ id: s.id, promoStartDate: s.promoStartDate, promoEndDate: s.promoEndDate, promoMaxUses: s.promoMaxUses }))
  );

  return services.map((s) => {
    const promoPrice = computePromoPrice(s);
    const usesRemaining = computePromoUsesRemaining(s, usageCounts.get(s.id) ?? 0);
    return {
      ...s,
      price: Number(s.price),
      promoPrice: usesRemaining === 0 ? null : promoPrice,
      promoDiscountValue: s.promoDiscountValue ? Number(s.promoDiscountValue) : null,
      promoMaxUses: s.promoMaxUses,
      promoUsesRemaining: promoPrice != null ? usesRemaining : null,
      avgRating: aggregateMap.get(s.id)?.avgRating ?? null,
      reviewCount: aggregateMap.get(s.id)?.reviewCount ?? 0,
    };
  });
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

  const usageCounts = await getPromoUsageCounts(
    [service.id],
    [{ id: service.id, promoStartDate: service.promoStartDate, promoEndDate: service.promoEndDate, promoMaxUses: service.promoMaxUses }]
  );

  const promoPrice = computePromoPrice(service);
  const usesRemaining = computePromoUsesRemaining(service, usageCounts.get(service.id) ?? 0);

  return {
    ...service,
    price: Number(service.price),
    promoPrice: usesRemaining === 0 ? null : promoPrice,
    promoDiscountValue: service.promoDiscountValue ? Number(service.promoDiscountValue) : null,
    promoMaxUses: service.promoMaxUses,
    promoUsesRemaining: promoPrice != null ? usesRemaining : null,
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
      if (!currentService) throw new AppError('Usługa nie znaleziona', 404);

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
