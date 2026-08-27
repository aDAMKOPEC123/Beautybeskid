import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export interface CreateBlockInput {
  startsAt: string;
  endsAt: string;
  reason?: string;
  appliesToAll: boolean;
  employeeIds?: string[];
}

const blockInclude = {
  employees: { select: { id: true, name: true } },
} as const;

export const listBlocks = async (from: string, to: string) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new AppError('Nieprawidłowy zakres dat', 400);
  }
  return await prisma.calendarBlock.findMany({
    where: { startsAt: { lt: toDate }, endsAt: { gt: fromDate } },
    include: blockInclude,
    orderBy: { startsAt: 'asc' },
  });
};

export const createBlock = async (input: CreateBlockInput, createdById?: string) => {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new AppError('Nieprawidłowa data blokady', 400);
  }
  if (endsAt <= startsAt) {
    throw new AppError('Godzina zakończenia musi być późniejsza niż rozpoczęcia', 400);
  }

  const employeeIds = input.employeeIds ?? [];
  if (!input.appliesToAll && employeeIds.length === 0) {
    throw new AppError('Wybierz co najmniej jednego pracownika', 400);
  }

  return await prisma.calendarBlock.create({
    data: {
      startsAt,
      endsAt,
      reason: input.reason?.trim() || null,
      appliesToAll: input.appliesToAll,
      createdById: createdById ?? null,
      ...(input.appliesToAll
        ? {}
        : { employees: { connect: employeeIds.map((id) => ({ id })) } }),
    },
    include: blockInclude,
  });
};

export const deleteBlock = async (id: string) => {
  const block = await prisma.calendarBlock.findUnique({ where: { id } });
  if (!block) throw new AppError('Nie znaleziono blokady', 404);
  await prisma.calendarBlock.delete({ where: { id } });
  return { success: true };
};
