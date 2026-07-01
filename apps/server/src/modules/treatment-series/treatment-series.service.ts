import { addDays, compareAsc, differenceInCalendarDays, startOfDay } from 'date-fns';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { sendPushToUser } from '../push/push.service';
import {
  buildSeriesStepStates,
  getNotificationTrigger,
  getReminderUrgency,
  type ReminderUrgency,
} from './treatment-series.helpers';

type DbClient = Prisma.TransactionClient | typeof prisma;

type ReminderKind = 'series' | 'interval';

interface ReminderBookingTarget {
  serviceId: string;
  seriesId?: string;
}

interface ReminderNextAppointment {
  id: string;
  date: Date;
  status: string;
  step: number;
}

interface SeriesReminderStep {
  step: number;
  status: 'completed' | 'scheduled' | 'due' | 'locked';
  dueDate: Date | null;
  completedAt: Date | null;
  appointmentId: string | null;
  appointmentDate: Date | null;
}

export interface SeriesReminderItem {
  id: string;
  kind: 'series';
  serviceId: string;
  serviceName: string;
  seriesId: string;
  completedVisits: number;
  totalVisits: number;
  nextStep: number | null;
  dueDate: Date | null;
  daysUntilDue: number | null;
  urgency: ReminderUrgency | null;
  lastVisitDate: Date | null;
  nextAppointment: ReminderNextAppointment | null;
  bookingTarget: ReminderBookingTarget;
  steps: SeriesReminderStep[];
}

export interface IntervalReminderItem {
  id: string;
  kind: 'interval';
  serviceId: string;
  serviceName: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
  dueDate: Date;
  daysUntilDue: number;
  urgency: ReminderUrgency;
  bookingTarget: ReminderBookingTarget;
}

export type ReminderItem = SeriesReminderItem | IntervalReminderItem;

const SCHEDULED_STATUSES = ['PENDING', 'CONFIRMED'] as const;

const getCompletionDate = (appointment: { completedAt: Date | null; date: Date }) =>
  appointment.completedAt ?? appointment.date;

const getReminderSortDate = (reminder: ReminderItem) =>
  reminder.kind === 'series'
    ? reminder.nextAppointment?.date ?? reminder.dueDate ?? new Date(8640000000000000)
    : reminder.dueDate;

const getSortedAppointmentDate = (appointment: {
  status: string;
  completedAt: Date | null;
  date: Date;
}) => (appointment.status === 'COMPLETED' ? getCompletionDate(appointment) : appointment.date);

const getActiveSeriesForService = async (
  db: DbClient,
  userId: string,
  serviceId: string,
) => {
  return db.treatmentSeries.findFirst({
    where: { userId, serviceId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
};

const getUpcomingSeriesAppointment = async (
  db: DbClient,
  treatmentSeriesId: string,
  step: number,
  excludeAppointmentId?: string,
) => {
  return db.appointment.findFirst({
    where: {
      treatmentSeriesId,
      treatmentSeriesStep: step,
      status: { in: [...SCHEDULED_STATUSES] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      status: true,
      treatmentSeriesStep: true,
    },
  });
};

const ensureSeriesCanAcceptBooking = async (
  db: DbClient,
  seriesId: string,
  nextStep: number,
  excludeAppointmentId?: string,
) => {
  const existing = await getUpcomingSeriesAppointment(db, seriesId, nextStep, excludeAppointmentId);
  if (existing) {
    throw new AppError('Kolejny etap tej serii ma juz zaplanowana wizyte', 409);
  }
};

const attachExistingUpcomingAppointmentToSeries = async (
  db: DbClient,
  {
    seriesId,
    userId,
    serviceId,
    nextStep,
    excludeAppointmentId,
  }: {
    seriesId: string;
    userId: string;
    serviceId: string;
    nextStep: number | null;
    excludeAppointmentId?: string;
  },
) => {
  if (!nextStep) return null;

  const alreadyAttached = await getUpcomingSeriesAppointment(
    db,
    seriesId,
    nextStep,
    excludeAppointmentId,
  );
  if (alreadyAttached) return alreadyAttached;

  const detachedAppointment = await db.appointment.findFirst({
    where: {
      userId,
      serviceId,
      treatmentSeriesId: null,
      status: { in: [...SCHEDULED_STATUSES] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      status: true,
      treatmentSeriesStep: true,
    },
  });

  if (!detachedAppointment) return null;

  await db.appointment.update({
    where: { id: detachedAppointment.id },
    data: {
      treatmentSeriesId: seriesId,
      treatmentSeriesStep: nextStep,
    },
  });

  return {
    ...detachedAppointment,
    treatmentSeriesStep: nextStep,
  };
};

const createSeriesFromFirstCompletedAppointment = async (
  db: DbClient,
  appointment: {
    id: string;
    userId: string;
    serviceId: string;
    completedAt: Date | null;
    date: Date;
    service: { seriesIntervalsDays: number[] };
  },
) => {
  const completionDate = getCompletionDate(appointment);
  const intervalsDays = appointment.service.seriesIntervalsDays;
  const totalVisits = intervalsDays.length + 1;
  const nextStep = totalVisits > 1 ? 2 : null;
  const nextDueDate = totalVisits > 1 ? addDays(completionDate, intervalsDays[0]) : null;
  const status = totalVisits > 1 ? 'ACTIVE' : 'COMPLETED';

  const series = await db.treatmentSeries.create({
    data: {
      userId: appointment.userId,
      serviceId: appointment.serviceId,
      intervalsDays,
      totalVisits,
      completedVisits: 1,
      nextStep,
      nextDueDate,
      lastCompletedAt: completionDate,
      status,
      startedFromAppointmentId: appointment.id,
      completedAt: status === 'COMPLETED' ? completionDate : null,
    },
  });

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      treatmentSeriesId: series.id,
      treatmentSeriesStep: 1,
    },
  });

  await attachExistingUpcomingAppointmentToSeries(db, {
    seriesId: series.id,
    userId: appointment.userId,
    serviceId: appointment.serviceId,
    nextStep,
    excludeAppointmentId: appointment.id,
  });

  return series;
};

export const attachAppointmentToSeries = async (
  db: DbClient,
  {
    appointmentId,
    userId,
    serviceId,
    explicitSeriesId,
  }: {
    appointmentId: string;
    userId: string;
    serviceId: string;
    explicitSeriesId?: string | null;
  },
) => {
  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: { isMultiVisit: true },
  });

  if (!service?.isMultiVisit) return null;

  const series = await getActiveSeriesForService(db, userId, serviceId);
  if (!series) {
    if (explicitSeriesId) {
      throw new AppError('Wybrana seria nie jest juz aktywna', 400);
    }
    return null;
  }

  if (!series.nextStep) {
    throw new AppError('Ta seria jest juz zakonczona', 400);
  }

  if (explicitSeriesId && explicitSeriesId !== series.id) {
    throw new AppError('Wybrana seria nie zgadza sie z aktywna seria uslugi', 400);
  }

  await ensureSeriesCanAcceptBooking(db, series.id, series.nextStep, appointmentId);

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      treatmentSeriesId: series.id,
      treatmentSeriesStep: series.nextStep,
    },
  });

  return series;
};

export const advanceTreatmentSeriesAfterCompletion = async (
  db: DbClient,
  appointmentId: string,
): Promise<unknown> => {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: {
        select: {
          isMultiVisit: true,
          seriesIntervalsDays: true,
        },
      },
    },
  });

  if (!appointment?.service.isMultiVisit) return null;
  if (!appointment.userId) return null; // guest appointment — no series tracking

  if (appointment.treatmentSeriesId) {
    const series = await db.treatmentSeries.findUnique({
      where: { id: appointment.treatmentSeriesId },
    });
    if (!series || series.status !== 'ACTIVE') return series;

    const completionDate = getCompletionDate(appointment);
    const step = appointment.treatmentSeriesStep ?? Math.min(series.completedVisits + 1, series.totalVisits);
    const completedVisits = Math.max(series.completedVisits, step);
    const isCompleted = completedVisits >= series.totalVisits;
    const nextStep = isCompleted ? null : completedVisits + 1;
    const nextDueDate =
      !isCompleted && series.intervalsDays[completedVisits - 1] !== undefined
        ? addDays(completionDate, series.intervalsDays[completedVisits - 1])
        : null;

    const updatedSeries = await db.treatmentSeries.update({
      where: { id: series.id },
      data: {
        completedVisits,
        nextStep,
        nextDueDate,
        lastCompletedAt: completionDate,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        completedAt: isCompleted ? completionDate : null,
      },
    });

    await attachExistingUpcomingAppointmentToSeries(db, {
      seriesId: series.id,
      userId: appointment.userId,
      serviceId: appointment.serviceId,
      nextStep,
      excludeAppointmentId: appointment.id,
    });

    return updatedSeries;
  }

  const activeSeries = await getActiveSeriesForService(db, appointment.userId!, appointment.serviceId);
  if (activeSeries?.nextStep) {
    const existingUpcoming = await getUpcomingSeriesAppointment(db, activeSeries.id, activeSeries.nextStep);
    if (!existingUpcoming || existingUpcoming.id === appointment.id) {
      await db.appointment.update({
        where: { id: appointment.id },
        data: {
          treatmentSeriesId: activeSeries.id,
          treatmentSeriesStep: activeSeries.nextStep,
        },
      });

      return advanceTreatmentSeriesAfterCompletion(db, appointment.id);
    }
  }

  return createSeriesFromFirstCompletedAppointment(db, { ...appointment, userId: appointment.userId! });
};

const buildSeriesReminderItems = async (userId: string, now: Date): Promise<SeriesReminderItem[]> => {
  const seriesList = await prisma.treatmentSeries.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ nextDueDate: 'asc' }, { createdAt: 'desc' }],
  });

  if (seriesList.length === 0) return [];

  const appointmentRows = await prisma.appointment.findMany({
    where: {
      treatmentSeriesId: {
        in: seriesList.map((series) => series.id),
      },
    },
    select: {
      id: true,
      date: true,
      status: true,
      completedAt: true,
      treatmentSeriesId: true,
      treatmentSeriesStep: true,
    },
    orderBy: { date: 'asc' },
  });

  const appointmentsBySeries = new Map<string, typeof appointmentRows>();
  for (const appointment of appointmentRows) {
    if (!appointment.treatmentSeriesId) continue;
    const rows = appointmentsBySeries.get(appointment.treatmentSeriesId) ?? [];
    rows.push(appointment);
    appointmentsBySeries.set(appointment.treatmentSeriesId, rows);
  }

  return seriesList.map((series) => {
    const appointments = appointmentsBySeries.get(series.id) ?? [];
    const completionDatesByStep = new Map<number, Date>();
    const appointmentIdsByStep = new Map<number, string>();

    for (const appointment of appointments) {
      if (!appointment.treatmentSeriesStep) continue;
      if (appointment.status === 'COMPLETED') {
        completionDatesByStep.set(
          appointment.treatmentSeriesStep,
          getCompletionDate(appointment),
        );
        appointmentIdsByStep.set(appointment.treatmentSeriesStep, appointment.id);
      }
    }

    const nextAppointmentRow =
      series.nextStep
        ? appointments.find(
            (appointment) =>
              appointment.treatmentSeriesStep === series.nextStep &&
              SCHEDULED_STATUSES.includes(appointment.status as (typeof SCHEDULED_STATUSES)[number]),
          ) ?? null
        : null;

    const nextAppointment = nextAppointmentRow
      ? {
          id: nextAppointmentRow.id,
          date: nextAppointmentRow.date,
          status: nextAppointmentRow.status,
          step: nextAppointmentRow.treatmentSeriesStep ?? series.nextStep ?? 0,
        }
      : null;

    const daysUntilDue = series.nextDueDate
      ? differenceInCalendarDays(startOfDay(series.nextDueDate), startOfDay(now))
      : null;

    return {
      id: series.id,
      kind: 'series' as const,
      serviceId: series.serviceId,
      serviceName: series.service.name,
      seriesId: series.id,
      completedVisits: series.completedVisits,
      totalVisits: series.totalVisits,
      nextStep: series.nextStep,
      dueDate: series.nextDueDate,
      daysUntilDue,
      urgency: daysUntilDue === null ? null : getReminderUrgency(daysUntilDue),
      lastVisitDate: series.lastCompletedAt,
      nextAppointment,
      bookingTarget: {
        serviceId: series.serviceId,
        seriesId: series.id,
      },
      steps: buildSeriesStepStates({
        totalVisits: series.totalVisits,
        completedVisits: series.completedVisits,
        nextStep: series.nextStep,
        nextDueDate: series.nextDueDate,
        upcomingAppointment: nextAppointment,
        completionDatesByStep,
        appointmentIdsByStep,
        now,
      }),
    };
  });
};

const buildIntervalReminderItems = async (userId: string, now: Date): Promise<IntervalReminderItem[]> => {
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      service: {
        isMultiVisit: false,
        recommendedIntervalDays: { not: null },
      },
    },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          recommendedIntervalDays: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  const latestByService = new Map<string, (typeof appointments)[number]>();
  for (const appointment of appointments) {
    if (!latestByService.has(appointment.serviceId)) {
      latestByService.set(appointment.serviceId, appointment);
    }
  }

  return [...latestByService.values()]
    .map((appointment) => {
      const lastVisitDate = getCompletionDate(appointment);
      const recommendedIntervalDays = appointment.service.recommendedIntervalDays!;
      const dueDate = addDays(lastVisitDate, recommendedIntervalDays);
      const daysUntilDue = differenceInCalendarDays(startOfDay(dueDate), startOfDay(now));

      return {
        id: `interval:${appointment.serviceId}`,
        kind: 'interval' as const,
        serviceId: appointment.serviceId,
        serviceName: appointment.service.name,
        lastVisitDate,
        recommendedIntervalDays,
        dueDate,
        daysUntilDue,
        urgency: getReminderUrgency(daysUntilDue),
        bookingTarget: {
          serviceId: appointment.serviceId,
        },
      };
    })
    .sort((left, right) => left.daysUntilDue - right.daysUntilDue);
};

export const getUserTreatmentReminders = async (userId: string): Promise<ReminderItem[]> => {
  const now = new Date();
  const [seriesItems, intervalItems] = await Promise.all([
    buildSeriesReminderItems(userId, now),
    buildIntervalReminderItems(userId, now),
  ]);

  return [...seriesItems, ...intervalItems].sort((left, right) =>
    compareAsc(getReminderSortDate(left), getReminderSortDate(right)),
  );
};

const sendSeriesNotification = async (series: {
  id: string;
  userId: string;
  serviceId: string;
  totalVisits: number;
  completedVisits: number;
  nextStep: number | null;
  nextDueDate: Date | null;
  service: { name: string };
}) => {
  if (!series.nextDueDate || !series.nextStep) return;

  const trigger = getNotificationTrigger(series.nextDueDate, new Date());
  if (!trigger) return;

  const payload = {
    title: 'Czas na kolejny etap zabiegu',
    body:
      trigger.kind === 'BEFORE_DUE'
        ? `${series.service.name}: za 3 dni warto zaplanowac etap ${series.nextStep}/${series.totalVisits}.`
        : trigger.kind === 'DUE'
        ? `${series.service.name}: dzisiaj wypada termin etapu ${series.nextStep}/${series.totalVisits}.`
        : `${series.service.name}: etap ${series.nextStep}/${series.totalVisits} czeka na rezerwacje.`,
    url: `/rezerwacja?serviceId=${series.serviceId}&seriesId=${series.id}`,
  };

  try {
    const notification = await prisma.treatmentSeriesNotification.create({
      data: {
        treatmentSeriesId: series.id,
        kind:
          trigger.kind === 'BEFORE_DUE'
            ? 'BEFORE_DUE'
            : trigger.kind === 'DUE'
            ? 'DUE'
            : 'OVERDUE',
        bucketKey: trigger.bucketKey,
        scheduledFor: trigger.scheduledFor,
      },
    });

    try {
      await sendPushToUser(series.userId, payload);
    } catch {
      await prisma.treatmentSeriesNotification.delete({
        where: { id: notification.id },
      }).catch(() => undefined);
      throw new Error('Failed to send push notification');
    }
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return;
    }

    throw error;
  }
};

export const processDueTreatmentSeriesNotifications = async () => {
  const activeSeries = await prisma.treatmentSeries.findMany({
    where: {
      status: 'ACTIVE',
      nextStep: { not: null },
      nextDueDate: { not: null },
    },
    include: {
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (activeSeries.length === 0) return;

  // Batch query instead of N individual queries per series
  const seriesIds = activeSeries.map((s) => s.id);
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      treatmentSeriesId: { in: seriesIds },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: {
      treatmentSeriesId: true,
      treatmentSeriesStep: true,
    },
  });

  const bookedKeys = new Set(
    upcomingAppointments
      .filter((a) => a.treatmentSeriesId && a.treatmentSeriesStep)
      .map((a) => `${a.treatmentSeriesId}:${a.treatmentSeriesStep}`),
  );

  for (const series of activeSeries) {
    if (!series.nextStep) continue;
    if (bookedKeys.has(`${series.id}:${series.nextStep}`)) continue;
    await sendSeriesNotification(series);
  }
};

const backfillSeriesForUserService = async (
  tx: Prisma.TransactionClient,
  userId: string,
  service: {
    id: string;
    seriesIntervalsDays: number[];
  },
) => {
  const existingSeriesCount = await tx.treatmentSeries.count({
    where: {
      userId,
      serviceId: service.id,
    },
  });

  if (existingSeriesCount > 0) return;

  if (service.seriesIntervalsDays.length === 0) return;

  const appointments = await tx.appointment.findMany({
    where: {
      userId,
      serviceId: service.id,
    },
    orderBy: { date: 'asc' },
  });

  const sortedAppointments = [...appointments].sort((left, right) =>
    compareAsc(getSortedAppointmentDate(left), getSortedAppointmentDate(right)),
  );

  let activeSeries: {
    id: string;
    completedVisits: number;
    totalVisits: number;
    nextStep: number | null;
    status: 'ACTIVE' | 'COMPLETED';
  } | null = null;

  for (const appointment of sortedAppointments.filter((row) => row.status === 'COMPLETED')) {
    const completionDate = getCompletionDate(appointment);

    if (!activeSeries || activeSeries.status === 'COMPLETED') {
      const createdSeries = await tx.treatmentSeries.create({
        data: {
          userId,
          serviceId: service.id,
          intervalsDays: service.seriesIntervalsDays,
          totalVisits: service.seriesIntervalsDays.length + 1,
          completedVisits: 1,
          nextStep: 2,
          nextDueDate: addDays(completionDate, service.seriesIntervalsDays[0]),
          lastCompletedAt: completionDate,
          startedFromAppointmentId: appointment.id,
          status: 'ACTIVE',
        },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          completedAt: appointment.completedAt ?? appointment.date,
          treatmentSeriesId: createdSeries.id,
          treatmentSeriesStep: 1,
        },
      });

      activeSeries = {
        id: createdSeries.id,
        completedVisits: 1,
        totalVisits: createdSeries.totalVisits,
        nextStep: createdSeries.nextStep,
        status: createdSeries.status,
      };
      continue;
    }

    const step: number = activeSeries.completedVisits + 1;
    const isCompleted: boolean = step >= activeSeries.totalVisits;
    const nextStep: number | null = isCompleted ? null : step + 1;
    const nextDueDate =
      !isCompleted && service.seriesIntervalsDays[step - 1] !== undefined
        ? addDays(completionDate, service.seriesIntervalsDays[step - 1])
        : null;

    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        completedAt: appointment.completedAt ?? appointment.date,
        treatmentSeriesId: activeSeries.id,
        treatmentSeriesStep: step,
      },
    });

    await tx.treatmentSeries.update({
      where: { id: activeSeries.id },
      data: {
        completedVisits: step,
        nextStep,
        nextDueDate,
        lastCompletedAt: completionDate,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        completedAt: isCompleted ? completionDate : null,
      },
    });

    activeSeries = {
      ...activeSeries,
      completedVisits: step,
      nextStep,
      status: isCompleted ? 'COMPLETED' : 'ACTIVE',
    };
  }

  if (!activeSeries || activeSeries.status !== 'ACTIVE' || !activeSeries.nextStep) {
    return;
  }

  const scheduledAppointment = sortedAppointments.find(
    (appointment) =>
      SCHEDULED_STATUSES.includes(appointment.status as (typeof SCHEDULED_STATUSES)[number]),
  );

  if (!scheduledAppointment) return;

  await tx.appointment.update({
    where: { id: scheduledAppointment.id },
    data: {
      treatmentSeriesId: activeSeries.id,
      treatmentSeriesStep: activeSeries.nextStep,
    },
  });
};

export const backfillTreatmentSeriesData = async () => {
  const services = await prisma.service.findMany({
    where: {
      isMultiVisit: true,
    },
    select: {
      id: true,
      seriesIntervalsDays: true,
    },
  });

  for (const service of services) {
    const users = await prisma.appointment.findMany({
      where: {
        serviceId: service.id,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    for (const { userId } of users) {
      if (!userId) continue;
      await prisma.$transaction((tx) => backfillSeriesForUserService(tx, userId, service));
    }
  }
};

let maintenanceInitialized = false;

export const initializeTreatmentSeriesMaintenance = async () => {
  if (maintenanceInitialized) return;
  maintenanceInitialized = true;

  await backfillTreatmentSeriesData();
  await processDueTreatmentSeriesNotifications();

  const interval = setInterval(() => {
    processDueTreatmentSeriesNotifications().catch(() => undefined);
  }, 60 * 60 * 1000);

  interval.unref?.();
};
