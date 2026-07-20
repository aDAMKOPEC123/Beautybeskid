import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    beautyPlan: { findFirst: vi.fn() },
    salonTerms: { findFirst: vi.fn() },
    salonLocation: { findFirst: vi.fn() },
    appointmentCancellationRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { findMany: vi.fn() },
  },
}));

vi.mock('../../socket', () => ({
  getIO: () => ({ to: () => ({ emit: vi.fn() }) }),
}));
vi.mock('../notifications/notifications.service', () => ({ createAndEmitNotification: vi.fn() }));
vi.mock('../push/push.service', () => ({ sendPushToUser: vi.fn(), sendPushToAdmins: vi.fn() }));

import { prisma } from '../../config/prisma';
import {
  getUserAppointmentHistory,
  getUserAppointmentsOverview,
  requestCancellation,
  withdrawReschedule,
} from './appointments.service';

const appointment = (id: string, date: Date) => ({
  id,
  userId: 'user-1',
  date,
  status: 'CONFIRMED',
  customDurationMinutes: null,
  service: { durationMinutes: 60 },
  cancellationRequests: [],
  homecareRoutine: null,
  _count: { recommendations: 0, journalEntries: 0 },
  photoPath: null,
});

describe('user appointment experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    (prisma.beautyPlan.findFirst as any).mockResolvedValue(null);
    (prisma.salonTerms.findFirst as any).mockResolvedValue({ version: '2.1', cancellationNoticeHours: 24 });
    (prisma.salonLocation.findFirst as any).mockResolvedValue({
      id: 'location-1',
      name: 'Salon',
      street: 'Testowa 1',
      postalCode: '00-001',
      city: 'Testowo',
      latitude: 50,
      longitude: 20,
      phone: '+48123456789',
      email: 'salon@example.com',
    });
    (prisma.user.findMany as any).mockResolvedValue([]);
  });

  it('separates the nearest appointment from later upcoming visits', async () => {
    const first = appointment('first', new Date('2030-01-01T10:00:00Z'));
    const second = appointment('second', new Date('2030-01-02T10:00:00Z'));
    (prisma.appointment.findMany as any).mockResolvedValue([first, second]);

    const result = await getUserAppointmentsOverview('user-1');

    expect(result.nextAppointment.id).toBe('first');
    expect(result.otherUpcoming.map((item: any) => item.id)).toEqual(['second']);
    expect(result.cancellationPolicy).toEqual({ noticeHours: 24, version: '2.1' });
    expect(result.salonContact.address).toBe('Testowa 1, 00-001 Testowo');
  });

  it('paginates and filters history on the server in newest-first order', async () => {
    (prisma.appointment.findMany as any).mockResolvedValue([]);
    (prisma.appointment.count as any).mockResolvedValue(24);

    const result = await getUserAppointmentHistory('user-1', { status: 'NO_SHOW', page: 2, limit: 10 });

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', status: 'NO_SHOW' },
      orderBy: { date: 'desc' },
      skip: 10,
      take: 10,
    }));
    expect(result).toMatchObject({ page: 2, limit: 10, total: 24, totalPages: 3 });
  });

  it('rejects an online cancellation request inside the policy window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T10:00:00Z'));
    (prisma.appointment.findUnique as any).mockResolvedValue(appointment('appointment-1', new Date('2030-01-02T09:00:00Z')));

    await expect(requestCancellation('appointment-1', 'user-1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.appointmentCancellationRequest.create).not.toHaveBeenCalled();
  });

  it('stores the policy snapshot for an eligible cancellation request', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T10:00:00Z'));
    const row = appointment('appointment-1', new Date('2030-01-03T10:00:00Z'));
    (prisma.appointment.findUnique as any).mockResolvedValue(row);
    (prisma.appointment.findUniqueOrThrow as any).mockResolvedValue(row);
    (prisma.appointmentCancellationRequest.create as any).mockResolvedValue({ id: 'request-1' });

    await requestCancellation('appointment-1', 'user-1', 'Zmiana planów');

    expect(prisma.appointmentCancellationRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appointmentId: 'appointment-1',
        userId: 'user-1',
        reason: 'Zmiana planów',
        policyNoticeHours: 24,
        policyVersion: '2.1',
      }),
    });
  });

  it('withdraws only the current user pending reschedule request', async () => {
    (prisma.appointment.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.appointment.findUniqueOrThrow as any).mockResolvedValue(appointment('appointment-1', new Date('2030-01-03T10:00:00Z')));

    await withdrawReschedule('appointment-1', 'user-1');

    expect(prisma.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'appointment-1', userId: 'user-1', rescheduleStatus: 'PENDING' }),
      data: { rescheduleDate: null, rescheduleStatus: null },
    }));
  });
});
