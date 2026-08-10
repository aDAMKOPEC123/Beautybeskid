import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    deviceToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

vi.mock('../../config/prisma', () => ({ prisma: mockPrisma }));

import { rotateRefreshToken, hashToken } from './session.service';

describe('rotateRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wydaje świeży token przy pierwszym użyciu', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result.stale).toBe(false);
    if (!result.stale) expect(result.token).not.toBe('stary');
  });

  it('wydaje świeży token także przy powtórnym użyciu w oknie karencji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 30_000),
      rotatedAt: new Date(Date.now() - 5_000),
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result.stale).toBe(false);
    if (!result.stale) expect(result.token).not.toBe('stary');
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
  });

  it('skraca ważność starego tokenu tylko przy pierwszej rotacji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    await rotateRefreshToken('stary', 'user-1', 1000);

    const updateArgs = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ tokenHash: hashToken('stary'), rotatedAt: null });
  });

  it('zwraca stale dla tokenu wygasłego i nie kasuje innych sesji', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      rotatedAt: new Date(Date.now() - 120_000),
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result).toEqual({ stale: true });
    expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('zwraca stale dla tokenu nieznanego', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

    expect(await rotateRefreshToken('obcy', 'user-1', 1000)).toEqual({ stale: true });
  });

  it('zwraca stale, gdy token należy do innego użytkownika, i nie tworzy nowego tokenu', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-2',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const result = await rotateRefreshToken('stary', 'user-1', 1000);

    expect(result).toEqual({ stale: true });
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});
