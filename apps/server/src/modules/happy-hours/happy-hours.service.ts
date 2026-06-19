import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { sendPushToAllUsers } from '../push/push.service';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { getIO } from '../../socket';
import { startOfDay, addDays } from 'date-fns';

export const getHappyHours = async () => {
  return prisma.happyHour.findMany({
    include: {
      employees: { select: { id: true, name: true, avatarPath: true } },
      services: { select: { id: true, name: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getActiveHappyHours = async () => {
  const today = startOfDay(new Date());
  const all = await prisma.happyHour.findMany({
    where: { isActive: true },
    include: {
      employees: { select: { id: true } },
      services: { select: { id: true, name: true, price: true } },
    },
  });
  // Filter out expired ONE_TIME happy hours
  return all.filter((hh) => {
    if (hh.type === 'ONE_TIME') {
      if (!hh.date) return false;
      return hh.date >= today;
    }
    return true;
  });
};

export const createHappyHour = async (data: {
  name: string;
  type: 'ONE_TIME' | 'RECURRING';
  date?: string | null;
  dayOfWeek?: number | null;
  startTime: string;
  endTime: string;
  discountType: 'PERCENTAGE' | 'AMOUNT';
  discountValue: number;
  isAllEmployees: boolean;
  isAllServices: boolean;
  employeeIds?: string[];
  serviceIds?: string[];
}) => {
  const happyHour = await prisma.happyHour.create({
    data: {
      name: data.name,
      type: data.type,
      date: data.date ? new Date(data.date) : null,
      dayOfWeek: data.dayOfWeek ?? null,
      startTime: data.startTime,
      endTime: data.endTime,
      discountType: data.discountType,
      discountValue: data.discountValue,
      isAllEmployees: data.isAllEmployees,
      isAllServices: data.isAllServices,
      employees: !data.isAllEmployees && data.employeeIds?.length
        ? { connect: data.employeeIds.map((id) => ({ id })) }
        : undefined,
      services: !data.isAllServices && data.serviceIds?.length
        ? { connect: data.serviceIds.map((id) => ({ id })) }
        : undefined,
    },
  });

  // Send push notification immediately for ONE_TIME
  if (data.type === 'ONE_TIME') {
    try {
      const discountLabel = `${data.discountValue}${data.discountType === 'PERCENTAGE' ? '%' : ' zł'}`;
      await sendPushToAllUsers({
        title: `⭐ Happy Hours — ${data.name}!`,
        body: `Dziś w godzinach ${data.startTime}–${data.endTime} zarezerwuj z rabatem ${discountLabel}!`,
        url: '/rezerwacja',
      });

      // Create in-app notifications for all users
      const users = await prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true },
      });
      const io = getIO();
      const discountLabelNotif = `${data.discountValue}${data.discountType === 'PERCENTAGE' ? '%' : ' zł'}`;
      await Promise.allSettled(
        users.map((u) =>
          createAndEmitNotification(io, {
            userId: u.id,
            type: 'GENERIC',
            title: `⭐ Happy Hours — ${data.name}!`,
            body: `Dziś w godzinach ${data.startTime}–${data.endTime} zarezerwuj z rabatem ${discountLabelNotif}!`,
            url: '/rezerwacja',
          }),
        ),
      );
    } catch (err) {
      console.error('Happy hours notification error:', err);
    }
  }

  return happyHour;
};

export const updateHappyHour = async (
  id: string,
  data: {
    name?: string;
    type?: 'ONE_TIME' | 'RECURRING';
    date?: string | null;
    dayOfWeek?: number | null;
    startTime?: string;
    endTime?: string;
    discountType?: 'PERCENTAGE' | 'AMOUNT';
    discountValue?: number;
    isAllEmployees?: boolean;
    isAllServices?: boolean;
    employeeIds?: string[];
    serviceIds?: string[];
  },
) => {
  const existing = await prisma.happyHour.findUnique({ where: { id } });
  if (!existing) throw new AppError('Happy Hour nie znaleziony', 404);

  return prisma.happyHour.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.date !== undefined && { date: data.date ? new Date(data.date) : null }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.endTime !== undefined && { endTime: data.endTime }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.isAllEmployees !== undefined && { isAllEmployees: data.isAllEmployees }),
      ...(data.isAllServices !== undefined && { isAllServices: data.isAllServices }),
      ...(data.employeeIds !== undefined && {
        employees: { set: data.employeeIds.map((eid) => ({ id: eid })) },
      }),
      ...(data.serviceIds !== undefined && {
        services: { set: data.serviceIds.map((sid) => ({ id: sid })) },
      }),
    },
  });
};

export const deleteHappyHour = async (id: string) => {
  const existing = await prisma.happyHour.findUnique({ where: { id } });
  if (!existing) throw new AppError('Happy Hour nie znaleziony', 404);
  return prisma.happyHour.delete({ where: { id } });
};

export const toggleHappyHour = async (id: string) => {
  const existing = await prisma.happyHour.findUnique({ where: { id } });
  if (!existing) throw new AppError('Happy Hour nie znaleziony', 404);
  return prisma.happyHour.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
};

export const initializeHappyHourScheduler = () => {
  const runScheduler = async () => {
    try {
      const tomorrow = addDays(startOfDay(new Date()), 1);
      const tomorrowDayOfWeek = (tomorrow.getDay() + 6) % 7;

      const recurringHappyHours = await prisma.happyHour.findMany({
        where: { type: 'RECURRING', isActive: true, dayOfWeek: tomorrowDayOfWeek },
      });

      for (const hh of recurringHappyHours) {
        const alreadySent = await prisma.happyHourNotification.findUnique({
          where: { happyHourId_sentForDate: { happyHourId: hh.id, sentForDate: tomorrow } },
        });

        if (alreadySent) continue;

        const discountLabel = `${hh.discountValue}${hh.discountType === 'PERCENTAGE' ? '%' : ' zł'}`;

        await sendPushToAllUsers({
          title: `⭐ Happy Hours jutro — ${hh.name}!`,
          body: `Jutro w godzinach ${hh.startTime}–${hh.endTime} zarezerwuj z rabatem ${discountLabel}!`,
          url: '/rezerwacja',
        });

        await prisma.happyHourNotification.upsert({
          where: { happyHourId_sentForDate: { happyHourId: hh.id, sentForDate: tomorrow } },
          update: { sentAt: new Date() },
          create: { happyHourId: hh.id, sentForDate: tomorrow },
        });
      }
    } catch (err) {
      console.error('Happy hour scheduler error:', err);
    }
  };

  // Run immediately on startup, then every hour
  runScheduler();
  setInterval(runScheduler, 3_600_000);
};
