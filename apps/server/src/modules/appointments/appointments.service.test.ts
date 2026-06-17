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
import { getAllAppointments } from './appointments.service';

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
