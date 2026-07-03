import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { generateCode } from '../../utils/generateCode';
import { sendEmail } from '../../utils/email';
import bcrypt from 'bcryptjs';

const VISIT_POINTS_PREFIXES = ['Punkty za wizyte: ', 'Punkty za wizyte:', 'Punkty za wizytę: ', 'Punkty za wizytę:'];

const extractVisitServiceName = (description: string): string | null => {
  for (const prefix of VISIT_POINTS_PREFIXES) {
    if (description.startsWith(prefix)) {
      return description.slice(prefix.length).trim();
    }
  }

  return null;
};

const ensureAmbassadorCode = async (userId: string): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const code = generateCode(8);

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { ambassadorCode: code },
        select: { ambassadorCode: true },
      });

      return updated.ambassadorCode!;
    } catch {
      // Unique constraint violation - retry with a new code.
    }
  }
  throw new AppError('Nie można wygenerować unikalnego kodu ambasadora', 500);
};

export const getAllUsers = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: { accountStatus: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarPath: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        createdAt: true,
        ambassadorCode: true,
        referralCount: true,
        termsAcceptedAt: true,
        marketingConsent: true,
        photoConsent: true,
        cardAllergies: true,
        cardConditions: true,
        cardPreferences: true,
        cardStaffNotes: true,
        _count: {
          select: {
            appointments: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where: { accountStatus: 'ACTIVE' } }),
  ]);

  return { data: users, total, totalPages: Math.ceil(total / limit) };
};


export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      onboardingCompleted: true,
      accountStatus: true,
      mustChangePassword: true,
      hasAcademyAccess: true,
      academyAccessExpiresAt: true,
      academyGrantedAt: true,
    },
  });

  if (!user) {
    throw new AppError('Nie znaleziono uzytkownika', 404);
  }

  if (!user.ambassadorCode) {
    const code = await ensureAmbassadorCode(id);
    return { ...user, ambassadorCode: code };
  }

  return user;
};

export const getUserDetails = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      termsAcceptedAt: true,
      marketingConsent: true,
      photoConsent: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      cardStaffNotes: true,
      appointments: {
        select: {
          id: true,
          date: true,
          status: true,
          notes: true,
          staffNote: true,
          createdAt: true,
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
            },
          },
          employee: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 50,
      },
      loyaltyTransactions: {
        select: {
          id: true,
          points: true,
          type: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      },
    },
  });

  if (!user) {
    throw new AppError('Nie znaleziono uzytkownika', 404);
  }

  const now = new Date();
  const lastVisit =
    user.appointments.find((a) => a.status === 'COMPLETED' && new Date(a.date) < now) ?? null;
  const upcoming = user.appointments.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.date) >= now,
  );

  // --- Financial stats (computed in JS, no extra DB queries) ---
  const completedAppointments = user.appointments.filter((a) => a.status === 'COMPLETED');
  const totalSpent = completedAppointments.reduce((sum, a) => sum + Number(a.service?.price ?? 0), 0);
  const completedCount = completedAppointments.length;
  const avgPerVisit = completedCount > 0 ? Math.round(totalSpent / completedCount) : 0;

  const serviceCount: Record<string, number> = {};
  for (const a of completedAppointments) {
    if (a.service?.name) {
      serviceCount[a.service.name] = (serviceCount[a.service.name] ?? 0) + 1;
    }
  }
  const mostFrequentService =
    Object.keys(serviceCount).length > 0
      ? Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  // --- Points earned per appointment (inline — do not refactor getUserTimeline) ---
  const earnTransactions = user.loyaltyTransactions.filter(
    (t) =>
      t.type === 'EARN' &&
      VISIT_POINTS_PREFIXES.some((prefix) => t.description.startsWith(prefix)),
  );
  const pointsMap = new Map<string, number>();
  for (const t of earnTransactions) {
    const serviceName = extractVisitServiceName(t.description);
    if (!serviceName) continue;
    for (const a of completedAppointments) {
      if (a.service?.name === serviceName && !pointsMap.has(a.id)) {
        pointsMap.set(a.id, t.points);
        break;
      }
    }
  }

  const allAppointments = user.appointments.map((a) => ({
    ...a,
    pointsEarned: pointsMap.get(a.id) ?? null,
  }));

  return {
    ...user,
    lastVisit,
    upcoming,
    allAppointments,
    stats: {
      totalSpent,
      avgPerVisit,
      mostFrequentService,
    },
  };
};

export const getUserTimeline = async (userId: string, cursor?: string, limit = 20) => {
  const cursorDate = cursor ? new Date(cursor) : undefined;
  const dateFilter = cursorDate ? { lt: cursorDate } : undefined;

  const [appointments, manualTransactions] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      include: {
        service: { select: { name: true } },
        employee: { select: { name: true } },
        review: { select: { rating: true } },
      },
      orderBy: { date: 'desc' },
      take: limit + 1,
    }),
    prisma.loyaltyTransaction.findMany({
      where: {
        userId,
        type: 'MANUAL_ADJUST',
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
  ]);

  const appointmentPointsMap = new Map<string, number>();

  if (appointments.length > 0) {
    const earnTransactions = await prisma.loyaltyTransaction.findMany({
      where: {
        userId,
        type: 'EARN',
        OR: VISIT_POINTS_PREFIXES.map((prefix) => ({
          description: { startsWith: prefix },
        })),
      },
      select: {
        description: true,
        points: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    for (const transaction of earnTransactions) {
      const serviceName = extractVisitServiceName(transaction.description);
      if (!serviceName) continue;

      for (const appointment of appointments) {
        if (appointment.service.name === serviceName && !appointmentPointsMap.has(appointment.id)) {
          appointmentPointsMap.set(appointment.id, transaction.points);
          break;
        }
      }
    }
  }

  const visitItems = appointments.map((appointment) => ({
    type: 'visit' as const,
    date: appointment.date,
    data: {
      serviceName: appointment.service.name,
      employeeName: appointment.employee?.name ?? null,
      rating: appointment.review?.rating ?? null,
      pointsEarned: appointmentPointsMap.get(appointment.id) ?? null,
    },
  }));

  const achievements = await prisma.userAchievement.findMany({
    where: {
      userId,
      ...(dateFilter ? { earnedAt: dateFilter } : {}),
    },
    include: {
      achievement: {
        select: {
          name: true,
          icon: true,
          description: true,
          pointsBonus: true,
        },
      },
    },
    orderBy: { earnedAt: 'desc' },
    take: limit + 1,
  });

  const achievementItems = achievements.map((userAchievement) => ({
    type: 'achievement' as const,
    date: userAchievement.earnedAt,
    data: {
      name: userAchievement.achievement.name,
      icon: userAchievement.achievement.icon,
      description: userAchievement.achievement.description,
      pointsBonus: userAchievement.achievement.pointsBonus,
    },
  }));

  const loyaltyItems = manualTransactions.map((transaction) => ({
    type: 'loyalty' as const,
    date: transaction.createdAt,
    data: {
      description: transaction.description,
      points: transaction.points,
    },
  }));

  const allItems = [...visitItems, ...achievementItems, ...loyaltyItems].sort(
    (left, right) => right.date.getTime() - left.date.getTime(),
  );

  const hasMore = allItems.length > limit;
  const items = allItems.slice(0, limit);
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].date.toISOString() : null;

  const [totalVisits, uniqueServicesResult, user] = await Promise.all([
    prisma.appointment.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.appointment.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { serviceId: true },
      distinct: ['serviceId'],
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, loyaltyTier: true },
    }),
  ]);

  const monthsInCosmo = user
    ? Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  return {
    items,
    stats: {
      totalVisits,
      uniqueServices: uniqueServicesResult.length,
      monthsInCosmo,
      tier: user?.loyaltyTier ?? 'BRONZE',
    },
    nextCursor,
  };
};

export const getMyReferrals = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ambassadorCode: true,
      referralCount: true,
      referrals: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) throw new AppError('Użytkownik nie znaleziony', 404);

  const milestones = [
    { at: 5, reward: 'Odznaka Ambasadora' },
    { at: 10, reward: 'Specjalna nagroda lojalnościowa' },
    { at: 25, reward: 'VIP Ambasador' },
  ];

  const nextMilestone = milestones.find((m) => m.at > user.referralCount);

  return {
    ambassadorCode: user.ambassadorCode,
    count: user.referralCount,
    referrals: user.referrals.map((r) => ({ id: r.id, registeredAt: r.createdAt })),
    milestones,
    nextMilestone: nextMilestone ?? null,
    progressToNext: nextMilestone
      ? Math.round((user.referralCount / nextMilestone.at) * 100)
      : 100,
  };
};

type UpdateUserData = Partial<{
  name: string;
  phone: string | null;
  avatarPath: string | null;
  onboardingCompleted: boolean;
  marketingConsent: boolean;
  photoConsent: boolean;
  cardAllergies: string | null;
  cardConditions: string | null;
  cardPreferences: string | null;
  cardStaffNotes: string | null;
  passwordHash: string;
  mustChangePassword: boolean;
  passwordChangedAt: Date;
}>;

export const updateUser = async (id: string, data: UpdateUserData) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      cardAllergies: true,
      cardConditions: true,
      cardPreferences: true,
      onboardingCompleted: true,
    },
  });
}

export const updateUserRole = async (id: string, role: 'USER' | 'ADMIN' | 'EMPLOYEE') => {
  if (!['USER', 'ADMIN', 'EMPLOYEE'].includes(role)) {
    throw new AppError('Nieprawidlowa rola', 400);
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new AppError('Uzytkownik nie istnieje', 404);

  return prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      avatarPath: true,
      loyaltyPoints: true,
      loyaltyTier: true,
      createdAt: true,
      ambassadorCode: true,
      referralCount: true,
      accountStatus: true,
    },
  });
};

export const getPendingUsers = async () => {
  return prisma.user.findMany({
    where: { accountStatus: 'PENDING' },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const approveUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'ACTIVE' } });

  sendEmail(
    user.email,
    'Konto zatwierdzone — BeskidStudio By Wiktoria Ćwik',
    `<p>Cześć ${user.name},</p><p>Twoje konto w aplikacji BeskidStudio By Wiktoria Ćwik zostało zatwierdzone. Możesz się teraz zalogować.</p>`
  ).catch(err => console.warn('[WARN] approveUser: email send failed:', err.message));
};

export const rejectUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.accountStatus !== 'PENDING') throw new AppError('Konto nie jest w statusie oczekującym', 400);

  await prisma.user.update({ where: { id }, data: { accountStatus: 'REJECTED' } });

  sendEmail(
    user.email,
    'Twoje konto zostało odrzucone',
    '<p>Niestety, Twoje konto w salonie BeskidStudio By Wiktoria Ćwik nie zostało zatwierdzone. Skontaktuj się z nami, aby dowiedzieć się więcej.</p>'
  ).catch(err => console.warn('[WARN] rejectUser: email send failed:', err.message));
};

export const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);

  if (!user.passwordHash) throw new AppError('To konto używa logowania przez Google. Zmiana hasła niedostępna.', 400);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Nieprawidłowe obecne hasło', 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false, passwordChangedAt: new Date() },
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      avatarPath: true, loyaltyPoints: true, loyaltyTier: true,
      createdAt: true, ambassadorCode: true, referralCount: true,
      termsAcceptedAt: true, marketingConsent: true, photoConsent: true,
      cardAllergies: true, cardConditions: true, cardPreferences: true,
      onboardingCompleted: true,
      accountStatus: true, mustChangePassword: true,
    },
  });
  return updated;
};

export const searchUsersByName = async (query: string) => {
  const q = query.trim();
  if (!q) return [];

  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarPath: true,
      hasAcademyAccess: true,
      academyAccessExpiresAt: true,
      academyGrantedAt: true,
    },
    take: 20,
    orderBy: { name: 'asc' },
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);
  if (user.role === 'ADMIN') throw new AppError('Nie można usunąć konta administratora', 403);

  await prisma.$transaction(async (tx) => {
    // Blog comments have onDelete: Restrict — must delete first
    await tx.blogComment.deleteMany({ where: { authorId: id } });

    // Skin journal comments by this user (no cascade)
    await tx.skinJournalComment.deleteMany({ where: { authorId: id } });

    // Appointment recommendations where this user is the adder (addedById is required String)
    await tx.appointmentRecommendation.deleteMany({ where: { addedById: id } });

    // Chat messages and rooms (no cascade)
    await tx.chatMessage.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
    await tx.chatRoom.deleteMany({ where: { userId: id } });

    // Reviews, achievements, service reminders (no cascade)
    await tx.review.deleteMany({ where: { userId: id } });
    await tx.userAchievement.deleteMany({ where: { userId: id } });
    await tx.serviceReminder.deleteMany({ where: { userId: id } });

    // Loyalty data (no cascade)
    await tx.loyaltyTransaction.deleteMany({ where: { userId: id } });
    await tx.userCoupon.deleteMany({ where: { userId: id } });

    // Discount codes usage and unlock codes locked to this user
    await tx.discountCodeUsage.deleteMany({ where: { userId: id } });
    await tx.discountCode.updateMany({ where: { lockedToUserId: id }, data: { lockedToUserId: null } });

    // Blog posts by this user (no cascade)
    await tx.blogPost.deleteMany({ where: { authorId: id } });

    // Employee record if this user is staff (no cascade)
    await tx.employee.deleteMany({ where: { userId: id } });

    // Appointments (no cascade)
    await tx.appointment.deleteMany({ where: { userId: id } });

    // Nullify referredById for users referred by this user
    await tx.user.updateMany({ where: { referredById: id }, data: { referredById: null } });

    // Delete user — Prisma cascades handle: PushSubscription, BlogPostLike,
    // BlogCommentReaction, TreatmentSeries, Notification, AppointmentRecommendation(userId),
    // SkinJournalEntry(userId), SkinWeatherProfile, SkinWeatherReport,
    // UserCourseProgress, UserLessonProgress, AcademyCertificate,
    // AcademyQuizAttempt, CourseFavorite, LessonNote, AcademyAccessLog
    await tx.user.delete({ where: { id } });
  });
};
