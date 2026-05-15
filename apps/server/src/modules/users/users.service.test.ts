import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('../../utils/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getPendingUsers, approveUser, rejectUser, changeUserPassword, getUserDetails } from './users.service';

describe('getPendingUsers', () => {
  it('returns users with PENDING accountStatus', async () => {
    const mockUsers = [{ id: '1', name: 'Jan', email: 'jan@test.pl', phone: null, createdAt: new Date() }];
    (prisma.user.findMany as any).mockResolvedValue(mockUsers);
    const result = await getPendingUsers();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountStatus: 'PENDING' } })
    );
    expect(result).toEqual(mockUsers);
  });
});

describe('approveUser', () => {
  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(approveUser('nonexistent')).rejects.toThrow(AppError);
  });

  it('throws 400 if user is not PENDING', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE', email: 'a@b.pl', name: 'X' });
    await expect(approveUser('1')).rejects.toThrow('Konto nie jest w statusie oczekującym');
  });

  it('sets accountStatus to ACTIVE for PENDING user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'PENDING', email: 'a@b.pl', name: 'X' });
    (prisma.user.update as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE' });
    await approveUser('1');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '1' }, data: { accountStatus: 'ACTIVE' } })
    );
  });
});

describe('rejectUser', () => {
  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(rejectUser('nonexistent')).rejects.toThrow(AppError);
  });

  it('throws 400 if user is not PENDING', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'ACTIVE', email: 'a@b.pl', name: 'X' });
    await expect(rejectUser('1')).rejects.toThrow('Konto nie jest w statusie oczekującym');
  });

  it('sets accountStatus to REJECTED for PENDING user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', accountStatus: 'PENDING', email: 'a@b.pl', name: 'X' });
    (prisma.user.update as any).mockResolvedValue({ id: '1', accountStatus: 'REJECTED' });
    await rejectUser('1');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '1' }, data: { accountStatus: 'REJECTED' } })
    );
  });
});

describe('changeUserPassword', () => {
  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(changeUserPassword('x', 'old', 'newpass123')).rejects.toThrow(AppError);
  });

  it('throws 400 if current password is wrong', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: 'hash' });
    const bcrypt = (await import('bcryptjs')).default;
    (bcrypt.compare as any).mockResolvedValue(false);
    await expect(changeUserPassword('1', 'wrong', 'newpass123')).rejects.toThrow('Nieprawidłowe obecne hasło');
  });

  it('updates passwordHash and sets mustChangePassword to false', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: 'hash' });
    const bcrypt = (await import('bcryptjs')).default;
    (bcrypt.compare as any).mockResolvedValue(true);
    (bcrypt.hash as any).mockResolvedValue('newhash');
    (prisma.user.update as any).mockResolvedValue({ id: '1', mustChangePassword: false });
    await changeUserPassword('1', 'oldpass', 'newpass123');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ mustChangePassword: false }) })
    );
  });
});

describe('getUserDetails', () => {
  const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'u1',
    email: 'test@test.pl',
    name: 'Anna',
    phone: null,
    role: 'USER',
    avatarPath: null,
    loyaltyPoints: 100,
    loyaltyTier: 'BRONZE',
    createdAt: new Date('2025-01-01'),
    termsAcceptedAt: null,
    marketingConsent: false,
    photoConsent: false,
    cardAllergies: null,
    cardConditions: null,
    cardPreferences: null,
    cardStaffNotes: null,
    appointments: [],
    loyaltyTransactions: [],
    ...overrides,
  });

  it('throws 404 if user not found', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(getUserDetails('nonexistent')).rejects.toThrow(AppError);
  });

  it('returns totalSpent=0, avgPerVisit=0, mostFrequentService=null for a new user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser());
    const result = await getUserDetails('u1');
    expect(result.stats.totalSpent).toBe(0);
    expect(result.stats.avgPerVisit).toBe(0);
    expect(result.stats.mostFrequentService).toBeNull();
  });

  it('computes totalSpent and avgPerVisit from COMPLETED appointments only', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: null,
        },
        {
          id: 'a2', date: new Date('2026-02-15'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's2', name: 'Pedicure', durationMinutes: 90, price: 180 },
          employee: null,
        },
        {
          id: 'a3', date: new Date('2026-03-01'), status: 'CANCELLED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's3', name: 'Zabieg', durationMinutes: 60, price: 200 },
          employee: null,
        },
      ],
    }));
    const result = await getUserDetails('u1');
    expect(result.stats.totalSpent).toBe(300);   // 120 + 180, not 200 (cancelled)
    expect(result.stats.avgPerVisit).toBe(150);   // 300 / 2
  });

  it('returns the most frequent service name from COMPLETED appointments', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        { id: 'a1', date: new Date('2026-01-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 100 }, employee: null },
        { id: 'a2', date: new Date('2026-02-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 100 }, employee: null },
        { id: 'a3', date: new Date('2026-03-01'), status: 'COMPLETED', notes: null, staffNote: null, createdAt: new Date(), service: { id: 's2', name: 'Pedicure', durationMinutes: 90, price: 150 }, employee: null },
      ],
    }));
    const result = await getUserDetails('u1');
    expect(result.stats.mostFrequentService).toBe('Manicure');
  });

  it('attaches pointsEarned to matching COMPLETED appointments via description prefix', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: { id: 'e1', name: 'Ania K.' },
        },
      ],
      loyaltyTransactions: [
        { id: 't1', points: 24, type: 'EARN', description: 'Punkty za wizyte: Manicure', createdAt: new Date('2026-01-10') },
      ],
    }));
    const result = await getUserDetails('u1');
    const appt = result.allAppointments.find((a: any) => a.id === 'a1');
    expect(appt?.pointsEarned).toBe(24);
    expect(appt?.employee?.name).toBe('Ania K.');
  });

  it('sets pointsEarned=null for appointments with no matching transaction', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(makeUser({
      appointments: [
        {
          id: 'a1', date: new Date('2026-01-10'), status: 'COMPLETED',
          notes: null, staffNote: null, createdAt: new Date(),
          service: { id: 's1', name: 'Manicure', durationMinutes: 60, price: 120 },
          employee: null,
        },
      ],
      loyaltyTransactions: [],
    }));
    const result = await getUserDetails('u1');
    const appt = result.allAppointments.find((a: any) => a.id === 'a1');
    expect(appt?.pointsEarned).toBeNull();
  });
});
