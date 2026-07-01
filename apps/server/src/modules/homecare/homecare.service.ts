import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser } from '../push/push.service';
import { getIO } from '../../socket';

export const getRoutine = async (appointmentId: string) => {
  const routine = await prisma.homecareRoutine.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          service: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!routine) throw new AppError('Rutyna nie istnieje', 404);
  return routine;
};

export const updateRoutine = async (
  appointmentId: string,
  data: { first48h?: string; followingDays?: string; products?: string },
) => {
  const routine = await prisma.homecareRoutine.findUnique({ where: { appointmentId } });
  if (!routine) throw new AppError('Rutyna nie istnieje', 404);

  return prisma.homecareRoutine.update({
    where: { appointmentId },
    data,
  });
};

export const sendRoutine = async (appointmentId: string) => {
  const routine = await prisma.homecareRoutine.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          service: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!routine) throw new AppError('Rutyna nie istnieje', 404);
  if (routine.sentAt) throw new AppError('Rutyna została już wysłana', 409);

  const updated = await prisma.homecareRoutine.update({
    where: { appointmentId },
    data: { sentAt: new Date() },
  });

  const userId = routine.appointment.user?.id;
  if (!userId) return updated;
  const serviceName = routine.appointment.service.name;

  try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId,
      type: 'GENERIC',
      title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
      body: `Sprawdź co robić po zabiegu: ${serviceName}`,
      url: '/user/rutyna',
    });
    await sendPushToUser(userId, {
      title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
      body: `Sprawdź co robić po zabiegu: ${serviceName}`,
      url: '/user/rutyna',
    });
  } catch (err) {
    console.error('Notification delivery failed (sendRoutine):', err);
  }

  return updated;
};

export const createRoutineDraft = async (appointmentId: string) => {
  const existing = await prisma.homecareRoutine.findUnique({ where: { appointmentId } });
  if (existing) return existing;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true },
  });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);

  return prisma.homecareRoutine.create({
    data: {
      appointmentId,
      first48h: appointment.service.routineFirst48h ?? '',
      followingDays: appointment.service.routineFollowingDays ?? '',
      products: appointment.service.routineProducts ?? '',
    },
  });
};

export const getMyRoutines = async (userId: string) => {
  return prisma.homecareRoutine.findMany({
    where: {
      appointment: { userId },
      sentAt: { not: null },
    },
    include: {
      appointment: {
        include: {
          service: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { sentAt: 'desc' },
  });
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.homecareRoutine.count({
    where: {
      appointment: { userId },
      sentAt: { not: null },
      viewedAt: null,
    },
  });
};

export const markViewed = async (userId: string): Promise<void> => {
  await prisma.homecareRoutine.updateMany({
    where: {
      appointment: { userId },
      sentAt: { not: null },
      viewedAt: null,
    },
    data: { viewedAt: new Date() },
  });
};

export const deleteMyRoutine = async (id: string, userId: string): Promise<void> => {
  const routine = await prisma.homecareRoutine.findUnique({
    where: { id },
    include: { appointment: { select: { userId: true } } },
  });
  if (!routine) throw new AppError('Rutyna nie istnieje', 404);
  if (routine.appointment.userId !== userId) throw new AppError('Brak uprawnień', 403);
  await prisma.homecareRoutine.delete({ where: { id } });
};
