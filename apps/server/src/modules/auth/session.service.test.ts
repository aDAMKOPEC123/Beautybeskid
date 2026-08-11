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
vi.mock('../../config/env', () => ({
  env: { JWT_REFRESH_SECRET: 'test-refresh-secret' },
}));

import {
  rotateRefreshToken,
  hashToken,
  issueDeviceToken,
  consumeDeviceToken,
  revokeDeviceTokens,
  revokeSessionOnLogout,
  deleteExpiredRefreshTokens,
} from './session.service';
import { verifyToken } from '../../utils/jwt';

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

    const result = await rotateRefreshToken('stary', 'user-1');

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

    const result = await rotateRefreshToken('stary', 'user-1');

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

    await rotateRefreshToken('stary', 'user-1');

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

    const result = await rotateRefreshToken('stary', 'user-1');

    expect(result).toEqual({ stale: true });
    expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
  });

  it('zwraca stale dla tokenu nieznanego', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null);

    expect(await rotateRefreshToken('obcy', 'user-1')).toEqual({ stale: true });
  });

  it('zwraca stale, gdy token należy do innego użytkownika, i nie tworzy nowego tokenu', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-2',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const result = await rotateRefreshToken('stary', 'user-1');

    expect(result).toEqual({ stale: true });
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('wydaje następcę jako podpisany JWT, akceptowalny przez pętlę kandydatów w handlerze refresh', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const result = await rotateRefreshToken('stary', 'user-1');

    expect(result.stale).toBe(false);
    if (result.stale) return;

    // Handler refresh robi verifyToken(candidate, JWT_REFRESH_SECRET) i korzysta
    // z decoded.iat do kontroli passwordChangedAt — losowy hex tego nie przejdzie.
    expect(result.token.split('.')).toHaveLength(3);
    const decoded = verifyToken(result.token, 'test-refresh-secret') as { id: string; iat?: number };
    expect(decoded.id).toBe('user-1');
    expect(typeof decoded.iat).toBe('number');
  });

  it('token zwrócony przez pierwszą rotację jest akceptowany przez drugą', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('stary'),
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
    });

    const first = await rotateRefreshToken('stary', 'user-1');
    expect(first.stale).toBe(false);
    if (first.stale) return;

    // Baza zna następcę pod jego hashem — dokładnie tak, jak zapisała go rotacja.
    const createArgs = mockPrisma.refreshToken.create.mock.calls[0][0];
    expect(createArgs.data.tokenHash).toBe(hashToken(first.token));

    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken(first.token),
      userId: 'user-1',
      expiresAt: createArgs.data.expiresAt,
      rotatedAt: null,
    });

    // Druga rotacja tym samym tokenem — to jest przebieg, który przy losowym
    // tokenie kończył się 401 przy każdym drugim odświeżeniu.
    expect(() => verifyToken(first.token, 'test-refresh-secret')).not.toThrow();
    const second = await rotateRefreshToken(first.token, 'user-1');

    expect(second.stale).toBe(false);
    if (!second.stale) expect(second.token).not.toBe(first.token);
  });
});

describe('sprzątanie i wylogowanie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteExpiredRefreshTokens kasuje wygasłe wiersze, także te nigdy nierotowane', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 3 });

    await deleteExpiredRefreshTokens('user-1');

    const args = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];
    expect(args.where.userId).toBe('user-1');
    expect(args.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(args.where).not.toHaveProperty('rotatedAt');
  });

  it('wylogowanie z ciasteczkiem, bez nagłówka X-Device-Token, kasuje tylko RefreshToken', async () => {
    await revokeSessionOnLogout('ciasteczko', undefined);

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('ciasteczko') },
    });
    // Bez nagłówka nie wiadomo, którego urządzenia dotyczy wylogowanie — zgadywanie
    // "wszystkie" jest właśnie tym, co to zachowanie naprawia. Żaden DeviceToken
    // nie może zostać skasowany.
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it('wylogowanie z nagłówkiem X-Device-Token kasuje dokładnie jeden wiersz DeviceToken po hashu tego tokenu, nie wszystkie urządzenia użytkownika', async () => {
    await revokeSessionOnLogout(undefined, 'dev-raw');

    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('dev-raw') },
    });
    // Krytyczne: filtr musi być po tokenHash tego jednego urządzenia, nigdy po userId —
    // to właśnie kasowanie po userId zabijało trwałą sesję PWA na innych urządzeniach.
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalledWith({
      where: { userId: expect.anything() },
    });
  });

  it('wylogowanie z ciasteczkiem i nagłówkiem kasuje RefreshToken po hashu ciasteczka i DeviceToken po hashu nagłówka — oba niezależnie, żadne inne urządzenie nietknięte', async () => {
    await revokeSessionOnLogout('ciasteczko', 'dev-raw');

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('ciasteczko') },
    });
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('dev-raw') },
    });
  });

  it('wylogowanie bez ciasteczka i bez nagłówka kończy się bez błędu i bez żadnego kasowania', async () => {
    await expect(revokeSessionOnLogout(undefined, undefined)).resolves.toBeUndefined();

    expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.deviceToken.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.deviceToken.findUnique).not.toHaveBeenCalled();
  });
});

describe('tokeny urządzeń', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zapisuje wyłącznie hash, zwraca surowy token', async () => {
    mockPrisma.deviceToken.create.mockResolvedValueOnce({});

    const raw = await issueDeviceToken('user-1', 'iPhone');

    expect(raw).toHaveLength(64);
    const args = mockPrisma.deviceToken.create.mock.calls[0][0];
    expect(args.data.tokenHash).toBe(hashToken(raw));
    expect(args.data.tokenHash).not.toBe(raw);
    expect(args.data.userId).toBe('user-1');
  });

  it('zwraca userId i przedłuża ważność ważnego tokenu', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('raw'),
      userId: 'user-7',
      expiresAt: new Date(Date.now() + 10_000),
    });
    mockPrisma.deviceToken.update.mockResolvedValueOnce({});

    const userId = await consumeDeviceToken('raw');

    expect(userId).toBe('user-7');
    expect(mockPrisma.deviceToken.update).toHaveBeenCalled();
  });

  it('odrzuca token wygasły', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce({
      tokenHash: hashToken('raw'),
      userId: 'user-7',
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await consumeDeviceToken('raw')).toBeNull();
  });

  it('odrzuca token nieznany', async () => {
    mockPrisma.deviceToken.findUnique.mockResolvedValueOnce(null);

    expect(await consumeDeviceToken('raw')).toBeNull();
  });

  it('revokeDeviceTokens kasuje tokeny wskazanego użytkownika', async () => {
    mockPrisma.deviceToken.deleteMany.mockResolvedValueOnce({ count: 2 });

    await revokeDeviceTokens('user-9');

    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-9' } });
  });
});
