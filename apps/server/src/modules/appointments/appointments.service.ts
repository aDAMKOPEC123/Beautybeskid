import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { markCouponUsed, getTierForPoints } from '../loyalty/loyalty.service';
import { generateCode } from '../../utils/generateCode';
import { getAvailability } from '../employees/employees.service';
import { AppError } from '../../middleware/error.middleware';
import { checkAndAward } from '../achievements/achievements.service';
import { getIO } from '../../socket';
import {
  advanceTreatmentSeriesAfterCompletion,
  attachAppointmentToSeries,
} from '../treatment-series/treatment-series.service';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser, sendPushToAdmins } from '../push/push.service';

const appointmentInclude = {
  service: {
    select: {
      id: true,
      name: true,
      price: true,
      durationMinutes: true,
      slug: true,
      category: true,
      imagePath: true,
      isMultiVisit: true,
      routineFirst48h: true,
      routineFollowingDays: true,
      routineProducts: true,
    },
  },
  employee: { select: { id: true, name: true, avatarPath: true } },
  location: {
    select: {
      id: true,
      name: true,
      street: true,
      postalCode: true,
      city: true,
      latitude: true,
      longitude: true,
      phone: true,
      email: true,
    },
  },
  user: { select: { id: true, name: true } },
  coupon: { include: { reward: true } },
  discountCodeUsage: { include: { discountCode: true } },
  cancellationRequests: {
    where: { status: 'PENDING' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      status: true,
      reason: true,
      policyNoticeHours: true,
      policyVersion: true,
      createdAt: true,
    },
  },
  homecareRoutine: {
    select: { id: true, sentAt: true },
  },
  _count: {
    select: {
      recommendations: true,
      journalEntries: { where: { photoPath: { not: null } } },
    },
  },
} as const;

const DEFAULT_LOCATION = {
  id: 'default-beskidstudio-location',
  name: 'BeskidStudio By Wiktoria Ćwik',
  street: 'Mordarka 505',
  postalCode: '34-600',
  city: 'Mordarka',
  latitude: 49.689496,
  longitude: 20.455024,
  phone: '+48532128227',
  email: 'kontakt@kosmetologwiktoriacwik.pl',
};

type DiscountSnapshot = {
  source: 'SERVICE_PROMOTION' | 'HAPPY_HOUR' | 'COUPON' | 'DISCOUNT_CODE' | 'VOUCHER';
  label: string;
  amount: number;
};

const todayInclude = {
  service: { select: { id: true, name: true, durationMinutes: true, price: true } },
  employee: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      avatarPath: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
    },
  },
  coupon: { include: { reward: true } },
} as const;

type DiscountType = 'PERCENTAGE' | 'AMOUNT';

const roundMoney = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

const applyDiscount = (price: number, type: DiscountType, rawValue: unknown) => {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return roundMoney(price);
  return type === 'PERCENTAGE'
    ? roundMoney(price * (1 - value / 100))
    : roundMoney(price - value);
};

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

async function resolveAppointmentPricing(
  tx: Prisma.TransactionClient,
  input: {
    userId: string | null;
    serviceId: string;
    employeeId?: string | null;
    date: Date;
    couponId?: string;
    discountCodeId?: string;
    voucherId?: string;
    voucherUsedAmount?: number;
    happyHourId?: string;
  },
) {
  const selectedBenefits = [input.couponId, input.discountCodeId, input.voucherId].filter(Boolean);
  if (selectedBenefits.length > 1) {
    throw new AppError('Do jednej wizyty można zastosować tylko jeden kupon, kod lub voucher', 400);
  }

  const service = await tx.service.findUnique({
    where: { id: input.serviceId },
    select: {
      id: true,
      name: true,
      price: true,
      promoDiscountType: true,
      promoDiscountValue: true,
      promoStartDate: true,
      promoEndDate: true,
      promoMaxUses: true,
      location: {
        select: {
          id: true,
          name: true,
          street: true,
          postalCode: true,
          city: true,
          latitude: true,
          longitude: true,
          phone: true,
          email: true,
        },
      },
    },
  });
  if (!service) throw new AppError('Usługa nie istnieje', 404);

  const priceAtBooking = roundMoney(Number(service.price));
  let finalPrice = priceAtBooking;
  const discountBreakdown: DiscountSnapshot[] = [];
  const now = new Date();

  const applyTrackedDiscount = (
    source: DiscountSnapshot['source'],
    label: string,
    type: DiscountType,
    value: unknown,
  ) => {
    const before = finalPrice;
    finalPrice = applyDiscount(finalPrice, type, value);
    const amount = roundMoney(before - finalPrice);
    if (amount > 0) discountBreakdown.push({ source, label, amount });
  };

  const promoIsActive = service.promoDiscountType
    && service.promoDiscountValue
    && service.promoStartDate
    && service.promoEndDate
    && now >= service.promoStartDate
    && now <= service.promoEndDate;

  if (promoIsActive) {
    let promoHasCapacity = true;
    if (service.promoMaxUses != null) {
      const promoUsageCount = await tx.appointment.count({
        where: {
          serviceId: service.id,
          status: { not: 'CANCELLED' },
          createdAt: { gte: service.promoStartDate!, lte: service.promoEndDate! },
        },
      });
      promoHasCapacity = promoUsageCount < service.promoMaxUses;
    }
    if (promoHasCapacity) {
      applyTrackedDiscount(
        'SERVICE_PROMOTION',
        `Promocja: ${service.name}`,
        service.promoDiscountType as DiscountType,
        service.promoDiscountValue,
      );
    }
  }

  if (input.happyHourId) {
    const happyHour = await tx.happyHour.findUnique({
      where: { id: input.happyHourId },
      include: {
        services: { select: { id: true } },
        employees: { select: { id: true } },
      },
    });
    if (!happyHour || !happyHour.isActive) {
      throw new AppError('Wybrana promocja Happy Hours nie jest już aktywna', 400);
    }

    const appointmentTime = `${String(input.date.getHours()).padStart(2, '0')}:${String(input.date.getMinutes()).padStart(2, '0')}`;
    const appointmentDayOfWeek = (input.date.getDay() + 6) % 7;
    const dateMatches = happyHour.type === 'ONE_TIME'
      ? !!happyHour.date && isSameLocalDay(happyHour.date, input.date)
      : happyHour.dayOfWeek === appointmentDayOfWeek;
    const timeMatches = appointmentTime >= happyHour.startTime && appointmentTime < happyHour.endTime;
    const serviceMatches = happyHour.isAllServices || happyHour.services.some(({ id }) => id === input.serviceId);
    const employeeMatches = happyHour.isAllEmployees
      || (!!input.employeeId && happyHour.employees.some(({ id }) => id === input.employeeId));

    if (!dateMatches || !timeMatches || !serviceMatches || !employeeMatches) {
      throw new AppError('Promocja Happy Hours nie obejmuje wybranego terminu', 400);
    }
    applyTrackedDiscount(
      'HAPPY_HOUR',
      happyHour.name,
      happyHour.discountType as DiscountType,
      happyHour.discountValue,
    );
  }

  if (input.couponId) {
    if (!input.userId) throw new AppError('Kupon wymaga konta klienta', 400);
    const coupon = await tx.userCoupon.findUnique({
      where: { id: input.couponId },
      include: { reward: true },
    });
    if (!coupon || coupon.userId !== input.userId || coupon.status !== 'ACTIVE') {
      throw new AppError('Kupon niedostępny lub już użyty', 400);
    }
    if (coupon.reward.discountType === 'PERCENTAGE' || coupon.reward.discountType === 'AMOUNT') {
      applyTrackedDiscount(
        'COUPON',
        coupon.reward.name,
        coupon.reward.discountType,
        coupon.reward.discountValue,
      );
    }
  }

  if (input.discountCodeId) {
    if (!input.userId) throw new AppError('Kod rabatowy wymaga konta klienta', 400);
    const code = await tx.discountCode.findUnique({
      where: { id: input.discountCodeId },
      include: { voucher: { select: { serviceId: true } } },
    });
    const existingUsage = code
      ? await tx.discountCodeUsage.findFirst({
          where: { discountCodeId: code.id, userId: input.userId },
          select: { id: true },
        })
      : null;
    if (
      !code
      || !code.isActive
      || (code.expiresAt && code.expiresAt < now)
      || (code.lockedToUserId && code.lockedToUserId !== input.userId)
      || (code.voucher?.serviceId && code.voucher.serviceId !== input.serviceId)
      || existingUsage
    ) {
      throw new AppError('Kod rabatowy jest nieprawidłowy lub został już użyty', 400);
    }
    applyTrackedDiscount(
      'DISCOUNT_CODE',
      `Kod rabatowy ${code.code}`,
      code.discountType as DiscountType,
      code.discountValue,
    );
  }

  let cashVoucherUsed = 0;
  if (input.voucherId) {
    const voucher = await tx.voucher.findUnique({ where: { id: input.voucherId } });
    const requestedAmount = Number(input.voucherUsedAmount);
    if (
      !voucher
      || voucher.type !== 'CASH'
      || voucher.validUntil < now
      || !Number.isFinite(requestedAmount)
      || requestedAmount <= 0
    ) {
      throw new AppError('Nieprawidłowy voucher gotówkowy', 400);
    }
    const remainingAmount = Number(voucher.remainingAmount ?? 0);
    if (remainingAmount <= 0) throw new AppError('Ten voucher został już w pełni wykorzystany', 400);
    cashVoucherUsed = roundMoney(Math.min(requestedAmount, remainingAmount, finalPrice));
    finalPrice = roundMoney(finalPrice - cashVoucherUsed);
    if (cashVoucherUsed > 0) {
      discountBreakdown.push({ source: 'VOUCHER', label: 'Voucher gotówkowy', amount: cashVoucherUsed });
    }
  }

  const location = service.location ?? DEFAULT_LOCATION;
  return {
    priceAtBooking,
    finalPrice,
    discountTotal: roundMoney(priceAtBooking - finalPrice),
    discountBreakdown,
    cashVoucherUsed,
    location: {
      id: location.id,
      name: location.name,
      address: `${location.street}, ${location.postalCode} ${location.city}`,
      latitude: location.latitude == null ? null : Number(location.latitude),
      longitude: location.longitude == null ? null : Number(location.longitude),
      phone: location.phone ?? DEFAULT_LOCATION.phone,
    },
  };
}

export const getTodayAppointments = async (employeeId?: string) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return prisma.appointment.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(employeeId ? { employeeId } : {}),
    },
    include: todayInclude,
    orderBy: { date: 'asc' },
  });
};

export const updateStaffNote = async (id: string, staffNote: string) => {
  return prisma.appointment.update({
    where: { id },
    data: { staffNote },
    include: todayInclude,
  });
};

export const updateAppointmentTime = async (
  id: string,
  data: { date?: string; customDurationMinutes?: number },
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: { select: { durationMinutes: true } },
    },
  });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);

  const newDate = data.date ? new Date(data.date) : new Date(appointment.date);
  const newDuration =
    data.customDurationMinutes ??
    appointment.customDurationMinutes ??
    appointment.service?.durationMinutes ??
    60;

  // Conflict check (skip for same appointment)
  if (appointment.employeeId) {
    const newEnd = new Date(newDate.getTime() + newDuration * 60_000);
    const conflictBuffer = newDuration * 60_000;
    const conflict = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        employeeId: appointment.employeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: {
          gte: new Date(newDate.getTime() - conflictBuffer),
          lt: newEnd,
        },
      },
      select: { id: true, date: true },
    });
    if (conflict) throw new AppError('Wybrany termin koliduje z inną wizytą', 409);
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(data.date ? { date: newDate } : {}),
      customDurationMinutes: newDuration,
    },
    include: todayInclude,
  });
};

interface CreateAppointmentData {
  serviceId: string;
  employeeId?: string;
  date: string;
  notes?: string;
  allergies?: string;
  problemDescription?: string;
  couponId?: string;
  discountCodeId?: string;
  voucherId?: string;
  voucherUsedAmount?: number;
  treatmentSeriesId?: string;
  happyHourId?: string;
}

export const createAppointment = async (userId: string, data: CreateAppointmentData) => {
  const { couponId, discountCodeId, voucherId, voucherUsedAmount, treatmentSeriesId, happyHourId, ...rest } = data;

  // BUG-01: Check slot availability before creating (best-effort — not serializable,
  // but catches the common case of same-slot double-booking)
  if (rest.employeeId) {
    const service = await prisma.service.findUnique({
      where: { id: rest.serviceId },
      select: { durationMinutes: true },
    });
    const apptStart = new Date(rest.date);
    const durationMs = (service?.durationMinutes ?? 60) * 60_000;
    const apptEnd = new Date(apptStart.getTime() + durationMs);

    const conflict = await prisma.appointment.findFirst({
      where: {
        employeeId: rest.employeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: {
          gte: new Date(apptStart.getTime() - durationMs),
          lt: apptEnd,
        },
      },
      select: { id: true },
    });
    if (conflict) throw new AppError('Wybrany termin jest niedostępny', 409);
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const appointmentDate = new Date(rest.date);
    const pricing = await resolveAppointmentPricing(tx, {
      userId,
      serviceId: rest.serviceId,
      employeeId: rest.employeeId,
      date: appointmentDate,
      couponId,
      discountCodeId,
      voucherId,
      voucherUsedAmount,
      happyHourId,
    });

    const created = await tx.appointment.create({
      data: {
        userId,
        serviceId: rest.serviceId,
        employeeId: rest.employeeId || null,
        date: appointmentDate,
        priceAtBooking: pricing.priceAtBooking,
        finalPrice: pricing.finalPrice,
        discountTotal: pricing.discountTotal,
        discountBreakdown: pricing.discountBreakdown as Prisma.InputJsonValue,
        locationId: pricing.location.id,
        locationNameAtBooking: pricing.location.name,
        locationAddressAtBooking: pricing.location.address,
        locationLatitudeAtBooking: pricing.location.latitude,
        locationLongitudeAtBooking: pricing.location.longitude,
        salonPhoneAtBooking: pricing.location.phone,
        notes: rest.notes || null,
        allergies: rest.allergies || null,
        problemDescription: rest.problemDescription || null,
        ...(happyHourId ? { happyHourId } : {}),
      },
      include: appointmentInclude,
    });

    // BUG-02: Validate and apply coupon/discount inside the same transaction
    if (couponId) {
      const coupon = await tx.userCoupon.findUnique({ where: { id: couponId } });
      if (!coupon || coupon.status !== 'ACTIVE') throw new AppError('Kupon niedostępny lub już użyty', 400);
      await tx.userCoupon.update({
        where: { id: couponId },
        data: { status: 'USED', usedAt: new Date(), appointmentId: created.id },
      });
    }

    if (discountCodeId) {
      const code = await tx.discountCode.findUnique({ where: { id: discountCodeId } });
      if (code && code.isActive && (!code.lockedToUserId || code.lockedToUserId === userId)) {
        await tx.discountCodeUsage.upsert({
          where: { discountCodeId_userId: { discountCodeId, userId } },
          create: { discountCodeId, userId, appointmentId: created.id },
          update: {},
        });
      }
    }

    if (voucherId && pricing.cashVoucherUsed > 0) {
      const v = await tx.voucher.findUnique({ where: { id: voucherId } });
      if (!v) throw new AppError('Nieprawidłowy voucher gotówkowy', 400);
      const current = Number(v.remainingAmount ?? 0);
      await tx.voucher.update({
        where: { id: voucherId },
        data: { remainingAmount: Math.max(0, current - pricing.cashVoucherUsed) },
      });
    }

    await attachAppointmentToSeries(tx, {
      appointmentId: created.id,
      userId,
      serviceId: rest.serviceId,
      explicitSeriesId: treatmentSeriesId ?? null,
    });

    return tx.appointment.findUniqueOrThrow({
      where: { id: created.id },
      include: appointmentInclude,
    });
  });

  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const client = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const clientName = client?.name ?? 'Klient';
    const serviceName = appointment.service?.name ?? 'Usługa';
    await Promise.all(admins.map((admin) =>
      createAndEmitNotification(io, {
        userId: admin.id,
        type: 'NEW_APPOINTMENT',
        title: 'Nowa rezerwacja',
        body: `${clientName} — ${serviceName}`,
        url: '/admin/wizyty',
        audience: 'ADMIN',
      })
    ));
  } catch (err) {
    console.error('Notification delivery failed (createAppointment):', err);
  }

  return appointment;
};

export const uploadAppointmentPhoto = async (id: string, userId: string, photoPath: string) => {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new AppError('Wizyta nie istnieje', 404);
  if (existing.userId !== userId) throw new AppError('Brak dostępu', 403);
  return prisma.appointment.update({
    where: { id },
    data: { photoPath },
    include: appointmentInclude,
  });
};

export const getUserAppointments = async (userId: string) => {
  const now = new Date();
  const [upcoming, history] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      include: appointmentInclude,
      take: 100,
    }),
    prisma.appointment.findMany({
      where: {
        userId,
        OR: [
          { status: { in: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
          { date: { lt: now } },
        ],
      },
      orderBy: { date: 'desc' },
      include: appointmentInclude,
      take: 200,
    }),
  ]);

  return [...upcoming, ...history];
};

type UserHistoryStatus = 'ALL' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const presentUserAppointment = (appointment: any, hasPublishedBeautyPlan: boolean) => ({
  ...appointment,
  durationMinutes: appointment.customDurationMinutes ?? appointment.service?.durationMinutes ?? 60,
  activeCancellationRequest: appointment.cancellationRequests?.[0] ?? null,
  postVisit: {
    recommendationsCount: appointment._count?.recommendations ?? 0,
    hasHomecareRoutine: Boolean(appointment.homecareRoutine?.sentAt),
    journalPhotoCount: appointment._count?.journalEntries ?? 0,
    hasAppointmentPhoto: Boolean(appointment.photoPath),
    hasPublishedBeautyPlan,
  },
});

const getSalonAppointmentSettings = async () => {
  const [terms, location] = await Promise.all([
    prisma.salonTerms.findFirst({
      select: { version: true, cancellationNoticeHours: true },
    }),
    prisma.salonLocation.findFirst({
      where: { isDefault: true, isActive: true },
      select: {
        id: true,
        name: true,
        street: true,
        postalCode: true,
        city: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  const safeLocation = location ?? DEFAULT_LOCATION;
  return {
    cancellationPolicy: {
      noticeHours: terms?.cancellationNoticeHours ?? 24,
      version: terms?.version ?? '1.0',
    },
    salonContact: {
      name: safeLocation.name,
      address: `${safeLocation.street}, ${safeLocation.postalCode} ${safeLocation.city}`,
      latitude: safeLocation.latitude == null ? null : Number(safeLocation.latitude),
      longitude: safeLocation.longitude == null ? null : Number(safeLocation.longitude),
      phone: safeLocation.phone ?? DEFAULT_LOCATION.phone,
      email: safeLocation.email ?? DEFAULT_LOCATION.email,
    },
  };
};

export const getUserAppointmentsOverview = async (userId: string) => {
  const now = new Date();
  const [upcoming, hasPublishedBeautyPlan, settings] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      include: appointmentInclude,
      take: 20,
    }),
    prisma.beautyPlan.findFirst({
      where: { userId, isPublished: true },
      select: { id: true },
    }).then(Boolean),
    getSalonAppointmentSettings(),
  ]);

  const presented = upcoming.map((appointment) => presentUserAppointment(appointment, hasPublishedBeautyPlan));
  return {
    nextAppointment: presented[0] ?? null,
    otherUpcoming: presented.slice(1),
    ...settings,
  };
};

export const getUserAppointmentHistory = async (
  userId: string,
  filters: { status?: UserHistoryStatus; page?: number; limit?: number },
) => {
  const status = filters.status ?? 'ALL';
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
  const now = new Date();
  const statusWhere: Prisma.AppointmentWhereInput = status === 'ALL'
    ? {
        OR: [
          { status: { in: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
          { date: { lt: now } },
        ],
      }
    : { status };
  const where: Prisma.AppointmentWhereInput = { userId, ...statusWhere };

  const [items, total, hasPublishedBeautyPlan] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: appointmentInclude,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appointment.count({ where }),
    prisma.beautyPlan.findFirst({
      where: { userId, isPublished: true },
      select: { id: true },
    }).then(Boolean),
  ]);

  return {
    items: items.map((appointment) => presentUserAppointment(appointment, hasPublishedBeautyPlan)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const getAllAppointments = async (filters?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const where: Record<string, unknown> = {};
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.status) where.status = filters.status;

  const take = Math.min(filters?.limit ?? 50, 200);
  const skip = filters?.page ? (filters.page - 1) * take : 0;

  const [data, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      orderBy: { date: 'desc' },
      take,
      skip,
      include: {
        ...appointmentInclude,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            _count: {
              select: {
                appointments: { where: { status: 'NO_SHOW' } },
              },
            },
          },
        },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  const totalPages = take ? Math.ceil(total / take) : 1;
  return { data, total, totalPages };
};

export const createAppointmentByAdmin = async (data: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  employeeId?: string;
  date: string;
  notes?: string;
}) => {
  let user = null;

  if (data.clientEmail) {
    user = await prisma.user.findUnique({ where: { email: data.clientEmail } });
  }
  if (!user) {
    user = await prisma.user.findFirst({ where: { phone: data.clientPhone }, orderBy: { createdAt: 'desc' } });
  }
  if (!user) {
    throw new AppError('Klient nie istnieje w systemie. Najpierw utwórz konto w sekcji Użytkownicy.', 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointmentDate = new Date(data.date);
    const pricing = await resolveAppointmentPricing(tx, {
      userId: user.id,
      serviceId: data.serviceId,
      employeeId: data.employeeId,
      date: appointmentDate,
    });
    const appointment = await tx.appointment.create({
      data: {
        userId: user.id,
        serviceId: data.serviceId,
        employeeId: data.employeeId || null,
        date: appointmentDate,
        priceAtBooking: pricing.priceAtBooking,
        finalPrice: pricing.finalPrice,
        discountTotal: pricing.discountTotal,
        discountBreakdown: pricing.discountBreakdown as Prisma.InputJsonValue,
        locationId: pricing.location.id,
        locationNameAtBooking: pricing.location.name,
        locationAddressAtBooking: pricing.location.address,
        locationLatitudeAtBooking: pricing.location.latitude,
        locationLongitudeAtBooking: pricing.location.longitude,
        salonPhoneAtBooking: pricing.location.phone,
        notes: data.notes || null,
        status: 'CONFIRMED',
      },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    await attachAppointmentToSeries(tx, {
      appointmentId: appointment.id,
      userId: user.id,
      serviceId: data.serviceId,
    });

    if (appointment.service) {
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (!existingRoutine) {
        await tx.homecareRoutine.create({
          data: {
            appointmentId: appointment.id,
            first48h: appointment.service.routineFirst48h ?? '',
            followingDays: appointment.service.routineFollowingDays ?? '',
            products: appointment.service.routineProducts ?? '',
          },
        });
      }
    }

    return tx.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });
  });

  try {
    const io = getIO();
    const serviceName = result.service?.name ?? 'Usługa';
    const dateStr = result.date.toISOString().slice(0, 10);
    await createAndEmitNotification(io, {
      userId: user.id,
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Wizyta potwierdzona',
      body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (createAppointmentByAdmin):', err);
  }

  return result;
};

export const createExternalClientAppointment = async (data: {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  employeeId?: string;
  date: string;
  notes?: string;
  customDurationMinutes?: number;
}) => {
  // Conflict check (best-effort, same as createAppointment)
  if (data.employeeId) {
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { durationMinutes: true },
    });
    const apptStart = new Date(data.date);
    const durationMs = (data.customDurationMinutes ?? service?.durationMinutes ?? 60) * 60_000;
    const apptEnd = new Date(apptStart.getTime() + durationMs);
    const conflict = await prisma.appointment.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: new Date(apptStart.getTime() - durationMs), lt: apptEnd },
      },
      select: { id: true },
    });
    if (conflict) throw new AppError('Wybrany termin jest niedostępny', 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const appointmentDate = new Date(data.date);
    const pricing = await resolveAppointmentPricing(tx, {
      userId: null,
      serviceId: data.serviceId,
      employeeId: data.employeeId,
      date: appointmentDate,
    });
    const appointment = await tx.appointment.create({
      data: {
        userId: null,
        clientName: data.clientName,
        clientPhone: data.clientPhone || null,
        clientEmail: data.clientEmail || null,
        customDurationMinutes: data.customDurationMinutes ?? null,
        serviceId: data.serviceId,
        employeeId: data.employeeId || null,
        date: appointmentDate,
        priceAtBooking: pricing.priceAtBooking,
        finalPrice: pricing.finalPrice,
        discountTotal: pricing.discountTotal,
        discountBreakdown: pricing.discountBreakdown as Prisma.InputJsonValue,
        locationId: pricing.location.id,
        locationNameAtBooking: pricing.location.name,
        locationAddressAtBooking: pricing.location.address,
        locationLatitudeAtBooking: pricing.location.latitude,
        locationLongitudeAtBooking: pricing.location.longitude,
        salonPhoneAtBooking: pricing.location.phone,
        notes: data.notes || null,
        status: 'CONFIRMED',
      },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    return tx.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      include: {
        service: true,
        employee: { select: { id: true, name: true, avatarPath: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });
  });

  return result;
};

export const deleteAppointment = async (id: string) => {
  return prisma.appointment.delete({ where: { id } });
};

export const requestReschedule = async (id: string, userId: string, newDate: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });

  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.userId !== userId) throw new AppError('Brak dostepu', 403);
  if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
    throw new AppError('Zmiana terminu jest mozliwa tylko dla aktywnych wizyt', 400);
  }
  if (appointment.rescheduleStatus === 'PENDING') {
    throw new AppError('Wniosek o zmiane terminu juz czeka na decyzje', 400);
  }
  if (appointment.cancellationRequests.length > 0) {
    throw new AppError('Najpierw wycofaj oczekujący wniosek o anulowanie wizyty', 409);
  }

  const date = new Date(newDate);
  if (isNaN(date.getTime()) || date <= new Date()) {
    throw new AppError('Nieprawidlowa data - musi byc w przyszlosci', 400);
  }

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const slots = await getAvailability(dateStr, appointment.serviceId, appointment.employeeId ?? undefined);
  const slot = slots.find((entry) => entry.time === timeStr);
  if (!slot || !slot.available) {
    throw new AppError('Wybrany slot jest niedostepny', 400);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { rescheduleDate: date, rescheduleStatus: 'PENDING' },
    include: appointmentInclude,
  });

  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const body = `${appointment.user?.name ?? 'Klient'} prosi o zmianę terminu wizyty.`;
    await Promise.all(admins.map((admin) => createAndEmitNotification(io, {
      userId: admin.id,
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Prośba o zmianę terminu',
      body,
      url: '/admin/wizyty',
      audience: 'ADMIN',
    })));
    await sendPushToAdmins({ title: 'Prośba o zmianę terminu', body, url: '/admin/wizyty' });
  } catch (error) {
    console.error('Failed to notify admins about reschedule request:', error);
  }

  return updated;
};

export const approveReschedule = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { service: { select: { id: true } }, employee: { select: { id: true } } },
  });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.rescheduleStatus !== 'PENDING' || !appointment.rescheduleDate) {
    throw new AppError('Brak oczekujacego wniosku o zmiane terminu', 400);
  }

  const requestedDate = appointment.rescheduleDate;
  const dateStr = `${requestedDate.getFullYear()}-${String(requestedDate.getMonth() + 1).padStart(2, '0')}-${String(requestedDate.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(requestedDate.getHours()).padStart(2, '0')}:${String(requestedDate.getMinutes()).padStart(2, '0')}`;
  const slots = await getAvailability(dateStr, appointment.serviceId, appointment.employeeId ?? undefined);
  const slot = slots.find((entry) => entry.time === timeStr);
  if (!slot?.available) {
    throw new AppError('Proponowany termin nie jest już dostępny. Odrzuć wniosek i skontaktuj się z klientem.', 409);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { date: appointment.rescheduleDate!, rescheduleDate: null, rescheduleStatus: null },
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (updated.user) try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId: updated.user.id,
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Wizyta przełożona',
      body: `Twoja wizyta została zatwierdzona na nowy termin`,
      url: '/user/wizyty',
    });
    await sendPushToUser(updated.user.id, {
      title: 'Wizyta przełożona',
      body: 'Twoja wizyta została zatwierdzona na nowy termin',
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (approveReschedule):', err);
  }

  return updated;
};

export const withdrawReschedule = async (id: string, userId: string) => {
  const result = await prisma.appointment.updateMany({
    where: {
      id,
      userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      rescheduleStatus: 'PENDING',
    },
    data: { rescheduleDate: null, rescheduleStatus: null },
  });
  if (result.count === 0) {
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) throw new AppError('Wizyta nie istnieje', 404);
    if (existing.userId !== userId) throw new AppError('Brak dostępu', 403);
    throw new AppError('Wniosek o zmianę terminu nie oczekuje już na decyzję', 409);
  }

  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.all(admins.map((admin) => createAndEmitNotification(io, {
      userId: admin.id,
      type: 'GENERIC',
      title: 'Wycofano prośbę o zmianę terminu',
      body: `${appointment.user?.name ?? 'Klient'} wycofał prośbę o zmianę terminu wizyty.`,
      url: '/admin/wizyty',
      audience: 'ADMIN',
    })));
  } catch (error) {
    console.error('Notification delivery failed (withdrawReschedule):', error);
  }
  return appointment;
};

export const requestCancellation = async (id: string, userId: string, reason?: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.userId !== userId) throw new AppError('Brak dostępu', 403);
  if (!['PENDING', 'CONFIRMED'].includes(appointment.status) || appointment.date <= new Date()) {
    throw new AppError('Anulowanie jest możliwe tylko dla aktywnej przyszłej wizyty', 400);
  }
  if (appointment.rescheduleStatus === 'PENDING') {
    throw new AppError('Najpierw wycofaj oczekujący wniosek o zmianę terminu', 409);
  }
  if (appointment.cancellationRequests.length > 0) {
    throw new AppError('Wniosek o anulowanie już oczekuje na decyzję', 409);
  }

  const settings = await getSalonAppointmentSettings();
  const noticeHours = settings.cancellationPolicy.noticeHours;
  const hoursUntilAppointment = (appointment.date.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilAppointment < noticeHours) {
    throw new AppError(
      `Wniosek online można złożyć najpóźniej ${noticeHours} godz. przed wizytą. Skontaktuj się bezpośrednio z salonem.`,
      409,
    );
  }

  const cleanReason = reason?.trim().slice(0, 500) || null;
  try {
    await prisma.appointmentCancellationRequest.create({
      data: {
        appointmentId: id,
        userId,
        reason: cleanReason,
        policyNoticeHours: noticeHours,
        policyVersion: settings.cancellationPolicy.version,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Wniosek o anulowanie już oczekuje na decyzję', 409);
    }
    throw error;
  }

  const updated = await prisma.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
  try {
    const io = getIO();
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const body = `${updated.user?.name ?? 'Klient'} prosi o anulowanie wizyty.`;
    await Promise.all(admins.map((admin) => createAndEmitNotification(io, {
      userId: admin.id,
      type: 'GENERIC',
      title: 'Prośba o anulowanie wizyty',
      body,
      url: '/admin/wizyty',
      audience: 'ADMIN',
    })));
    await sendPushToAdmins({ title: 'Prośba o anulowanie wizyty', body, url: '/admin/wizyty' });
  } catch (error) {
    console.error('Notification delivery failed (requestCancellation):', error);
  }
  return updated;
};

export const withdrawCancellation = async (id: string, userId: string) => {
  const request = await prisma.appointmentCancellationRequest.findFirst({
    where: { appointmentId: id, userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (!request) throw new AppError('Brak oczekującego wniosku o anulowanie', 409);

  await prisma.appointmentCancellationRequest.update({
    where: { id: request.id },
    data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
  });
  return prisma.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
};

export const decideCancellation = async (
  id: string,
  adminId: string,
  decision: 'APPROVED' | 'REJECTED',
  decisionNote?: string,
) => {
  const pending = await prisma.appointmentCancellationRequest.findFirst({
    where: { appointmentId: id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (!pending) throw new AppError('Brak oczekującego wniosku o anulowanie', 409);

  const appointment = await prisma.$transaction(async (tx) => {
    const changed = await tx.appointmentCancellationRequest.updateMany({
      where: { id: pending.id, status: 'PENDING' },
      data: {
        status: decision,
        decidedById: adminId,
        decisionNote: decisionNote?.trim().slice(0, 500) || null,
        decidedAt: new Date(),
      },
    });
    if (changed.count === 0) throw new AppError('Wniosek został już rozpatrzony', 409);
    if (decision === 'APPROVED') {
      await tx.appointment.update({
        where: { id },
        data: { status: 'CANCELLED', rescheduleDate: null, rescheduleStatus: null },
      });
    }
    return tx.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
  });

  if (appointment.userId) try {
    const io = getIO();
    const approved = decision === 'APPROVED';
    const title = approved ? 'Wizyta została anulowana' : 'Wniosek o anulowanie odrzucony';
    const body = approved
      ? 'Salon zatwierdził anulowanie Twojej wizyty.'
      : decisionNote?.trim() || 'Wizyta pozostaje aktywna. W razie pytań skontaktuj się z salonem.';
    await createAndEmitNotification(io, {
      userId: appointment.userId,
      type: 'GENERIC',
      title,
      body,
      url: '/user/wizyty',
    });
    await sendPushToUser(appointment.userId, { title, body, url: '/user/wizyty' });
  } catch (error) {
    console.error('Notification delivery failed (decideCancellation):', error);
  }
  return appointment;
};

export const rejectReschedule = async (id: string) => {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) throw new AppError('Wizyta nie istnieje', 404);
  if (appointment.rescheduleStatus !== 'PENDING') {
    throw new AppError('Brak oczekujacego wniosku o zmiane terminu', 400);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { rescheduleDate: null, rescheduleStatus: null },
    include: {
      ...appointmentInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  try {
    const io = getIO();
    await createAndEmitNotification(io, {
      userId: appointment.userId!,
      type: 'GENERIC',
      title: 'Zmiana terminu odrzucona',
      body: 'Twoja prośba o zmianę terminu wizyty została odrzucona. Wizyta odbywa się w pierwotnym terminie.',
      url: '/user/wizyty',
    });
  } catch (err) {
    console.error('Notification delivery failed (rejectReschedule):', err);
  }

  return updated;
};

export const updateStatus = async (
  id: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW',
  actorId?: string,
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { id },
      include: { service: true, user: true, employee: { select: { id: true, name: true } } },
    });

    if (!existing) {
      throw new AppError('Wizyta nie istnieje', 404);
    }

    const TERMINAL_STATUSES = ['COMPLETED', 'NO_SHOW'] as const;
    if ((TERMINAL_STATUSES as readonly string[]).includes(existing.status) && existing.status !== status) {
      throw new AppError('Nie mozna zmienic statusu zakonczonej wizyty', 400);
    }

    const pointsToAward = status === 'COMPLETED' && existing.status !== 'COMPLETED'
      ? Math.floor(Number(existing.finalPrice))
      : null;

    const appointment = await tx.appointment.update({
      where: { id },
      data: {
        status,
        ...(['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status)
          ? { rescheduleDate: null, rescheduleStatus: null }
          : {}),
        ...(status === 'COMPLETED' && existing.status !== 'COMPLETED'
          ? { completedAt: new Date(), loyaltyPointsAwarded: pointsToAward }
          : {}),
      },
      include: { service: true, user: true, employee: { select: { id: true, name: true } } },
    });

    if (status === 'CANCELLED') {
      await tx.appointmentCancellationRequest.updateMany({
        where: { appointmentId: id, status: 'PENDING' },
        data: { status: 'APPROVED', decidedById: actorId ?? null, decidedAt: new Date() },
      });
    } else if (status === 'COMPLETED' || status === 'NO_SHOW') {
      await tx.appointmentCancellationRequest.updateMany({
        where: { appointmentId: id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          decidedById: actorId ?? null,
          decisionNote: 'Wizyta została już zakończona.',
          decidedAt: new Date(),
        },
      });
    }

    let tierChanged = false;
    let routineAutoSent = false;

    // When transitioning to CONFIRMED: create homecare routine draft from service template
    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED' && appointment.service) {
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (!existingRoutine) {
        await tx.homecareRoutine.create({
          data: {
            appointmentId: appointment.id,
            first48h: appointment.service.routineFirst48h ?? '',
            followingDays: appointment.service.routineFollowingDays ?? '',
            products: appointment.service.routineProducts ?? '',
          },
        });
      }
    }

    if (status === 'COMPLETED' && existing.status !== 'COMPLETED' && appointment.service) {
      if (appointment.userId) {
        await advanceTreatmentSeriesAfterCompletion(tx, appointment.id);
      }

      if (appointment.user) {
        const points = appointment.loyaltyPointsAwarded ?? Math.floor(Number(appointment.finalPrice));

        await tx.loyaltyTransaction.create({
          data: {
            userId: appointment.user.id,
            points,
            type: 'EARN',
            description: `Punkty za wizyte: ${appointment.service.name}`,
          },
        });

        // Tier is based on total loyalty points after this visit
        const newPointsTotal = (appointment.user.loyaltyPoints ?? 0) + points;
        const newTier = getTierForPoints(newPointsTotal);
        if (newTier !== existing.user!.loyaltyTier) {
          tierChanged = true;
        }

        await tx.user.update({
          where: { id: appointment.user.id },
          data: { loyaltyPoints: { increment: points }, loyaltyTier: newTier },
        });
      }

      // Find existing routine and mark as sent if not already sent
      const existingRoutine = await tx.homecareRoutine.findUnique({
        where: { appointmentId: appointment.id },
      });
      if (existingRoutine && !existingRoutine.sentAt) {
        await tx.homecareRoutine.update({
          where: { appointmentId: appointment.id },
          data: { sentAt: new Date() },
        });
        routineAutoSent = true;
      }
    }

    return {
      appointment,
      wasNewlyCompleted: status === 'COMPLETED' && existing.status !== 'COMPLETED',
      tierChanged,
      routineAutoSent,
    };
  });

  if (result.wasNewlyCompleted && result.appointment.user) {
    try {
      const newAchievements = await checkAndAward(result.appointment.user.id);
      if (newAchievements.length > 0) {
        const io = getIO();
        for (const achievement of newAchievements) {
          io.to(`user:${result.appointment.user.id}`).emit('notification:achievement', {
            type: 'ACHIEVEMENT_EARNED',
            achievement: {
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              pointsBonus: achievement.pointsBonus,
            },
          });
        }
      }
    } catch {
      // Achievement refresh should not fail the main flow.
    }
  }

  if (result.routineAutoSent && result.appointment.user) {
    try {
      const io = getIO();
      const apt = result.appointment;
      const serviceName = apt.service?.name ?? 'Usługa';
      await createAndEmitNotification(io, {
        userId: apt.user!.id,
        type: 'GENERIC',
        title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
        body: `Sprawdź co robić po zabiegu: ${serviceName}`,
        url: '/user/rutyna',
      });
      await sendPushToUser(apt.user!.id, {
        title: 'Twoja rutyna pielęgnacyjna jest gotowa 💆‍♀️',
        body: `Sprawdź co robić po zabiegu: ${serviceName}`,
        url: '/user/rutyna',
      });
    } catch (err) {
      console.error('Notification delivery failed (routineAutoSent):', err);
    }
  }

  if (result.appointment.user) try {
    const io = getIO();
    const apt = result.appointment;
    const dateStr = apt.date.toISOString().slice(0, 10);
    const serviceName = apt.service?.name ?? 'Usługa';
    if (status === 'CONFIRMED') {
      await createAndEmitNotification(io, {
        userId: apt.user!.id,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Wizyta potwierdzona',
        body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
        url: '/user/wizyty',
      });
      await sendPushToUser(apt.user!.id, {
        title: 'Wizyta potwierdzona',
        body: `Twoja wizyta na ${serviceName} została potwierdzona`,
        url: '/user/wizyty',
      });
    } else if (status === 'CANCELLED') {
      await createAndEmitNotification(io, {
        userId: apt.user!.id,
        type: 'APPOINTMENT_CANCELLED',
        title: 'Wizyta odwołana',
        body: `Twoja wizyta: ${serviceName} — ${dateStr}`,
        url: '/user/wizyty',
      });
      await sendPushToUser(apt.user!.id, {
        title: 'Wizyta odwołana',
        body: `Twoja wizyta na ${serviceName} została odwołana`,
        url: '/user/wizyty',
      });
    }
    if (result.tierChanged) {
      await createAndEmitNotification(io, {
        userId: apt.user!.id,
        type: 'LOYALTY_TIER_UP',
        title: 'Nowy poziom lojalności!',
        body: 'Gratulacje! Osiągnąłeś nowy poziom w programie lojalnościowym.',
        url: '/user/lojalnosc',
      });
    }
  } catch (err) {
    console.error('Notification delivery failed (updateStatus):', err);
  }

  return result.appointment;
};

export interface FollowUpReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: string;
  recommendedReturnDate: string;
  daysOverdue: number;
}

interface CompletedAptForReminder {
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  lastVisitDate: Date;
  recommendedIntervalDays: number;
}

// Pure calculation — exported for unit testing.
// Uses date-fns for DST-safe calendar-day arithmetic.
export function computeFollowUpReminders(
  apts: CompletedAptForReminder[],
  today: Date
): FollowUpReminder[] {
  const todayDay = startOfDay(today);

  return apts
    .map((apt) => {
      const lastVisit = startOfDay(apt.lastVisitDate);
      const triggerDays = Math.floor(apt.recommendedIntervalDays * 0.85);
      const triggerDate = addDays(lastVisit, triggerDays);
      const recommendedReturnDate = addDays(lastVisit, apt.recommendedIntervalDays);

      if (todayDay < triggerDate) return null;

      const daysOverdue = differenceInCalendarDays(todayDay, recommendedReturnDate);

      return {
        serviceId: apt.serviceId,
        serviceName: apt.serviceName,
        serviceSlug: apt.serviceSlug,
        lastVisitDate: apt.lastVisitDate.toISOString(),
        recommendedReturnDate: recommendedReturnDate.toISOString(),
        daysOverdue,
      } satisfies FollowUpReminder;
    })
    .filter((r): r is FollowUpReminder => r !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const getFollowUpReminders = async (userId: string): Promise<FollowUpReminder[]> => {
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      service: { recommendedIntervalDays: { not: null } },
    },
    include: {
      service: {
        select: { id: true, name: true, slug: true, recommendedIntervalDays: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Keep only the most recent appointment per serviceId
  const latestByService = new Map<string, typeof appointments[number]>();
  for (const apt of appointments) {
    if (!latestByService.has(apt.serviceId)) {
      latestByService.set(apt.serviceId, apt);
    }
  }

  const input: CompletedAptForReminder[] = [...latestByService.values()].map((apt) => ({
    serviceId: apt.service.id,
    serviceName: apt.service.name,
    serviceSlug: apt.service.slug,
    lastVisitDate: new Date(apt.date),
    recommendedIntervalDays: apt.service.recommendedIntervalDays!,
  }));

  return computeFollowUpReminders(input, new Date());
};

export const getUpcomingCount = async (userId: string): Promise<number> => {
  return prisma.appointment.count({
    where: {
      userId,
      date: { gte: new Date() },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
};
