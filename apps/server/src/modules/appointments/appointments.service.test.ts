import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((arr: unknown[]) => Promise.all(arr as Promise<unknown>[])),
  },
}));

import { prisma } from '../../config/prisma';
import { getAllAppointments, getUserAppointments } from './appointments.service';

describe('getAllAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointment.findMany as any).mockResolvedValue([]);
    (prisma.appointment.count as any).mockResolvedValue(0);
  });

  it('calls findMany with no where clause when no filters passed', async () => {
    await getAllAppointments();
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('filters by userId when provided', async () => {
    await getAllAppointments({ userId: 'user-123' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } })
    );
  });

  it('filters by status when provided', async () => {
    await getAllAppointments({ status: 'COMPLETED' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'COMPLETED' } })
    );
  });

  it('applies skip and take for pagination', async () => {
    await getAllAppointments({ page: 2, limit: 10 });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});

describe('NO_SHOW status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointment.findMany as any).mockResolvedValue([]);
    (prisma.appointment.count as any).mockResolvedValue(0);
  });

  it('filters by NO_SHOW status when provided', async () => {
    await getAllAppointments({ status: 'NO_SHOW' });
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'NO_SHOW' } })
    );
  });
});

describe('getUserAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns upcoming visits first and newest history afterwards', async () => {
    (prisma.appointment.findMany as any)
      .mockResolvedValueOnce([{ id: 'upcoming' }])
      .mockResolvedValueOnce([{ id: 'newest-history' }, { id: 'older-history' }]);

    const result = await getUserAppointments('user-123');

    expect(result.map((appointment: any) => appointment.id)).toEqual([
      'upcoming',
      'newest-history',
      'older-history',
    ]);
    expect(prisma.appointment.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ orderBy: { date: 'asc' }, take: 100 }),
    );
    expect(prisma.appointment.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderBy: { date: 'desc' },
        take: 200,
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { status: { in: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
          ]),
        }),
      }),
    );
  });
});
