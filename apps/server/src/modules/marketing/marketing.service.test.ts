import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    contentPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    rolkaIdea: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import {
  getPosts,
  getIdeas,
  scheduleIdea,
  duplicateIdea,
} from './marketing.service';

const mockPost = {
  id: 'post1',
  title: 'Test post',
  platform: 'IG' as const,
  format: 'ROLKA' as const,
  scheduledAt: new Date('2026-07-01T18:00:00Z'),
  status: 'POMYSL' as const,
  thumbnailUrl: null,
  notes: null,
  ideaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockIdea = {
  id: 'idea1',
  title: 'Before/after laminacja',
  hook: 'Nie uwierzysz w efekt',
  sceneDesc: 'Zbliżenie na rzęsy przed i po',
  category: 'LAMINACJA' as const,
  type: 'BEFORE_AFTER' as const,
  audioName: null,
  audioUrl: null,
  props: 'Dobre oswietlenie',
  status: 'POMYSL' as const,
  plannedDate: null,
  post: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPosts', () => {
  it('zwraca liste postow', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([mockPost]);
    const result = await getPosts({});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test post');
  });
});

describe('getIdeas', () => {
  it('zwraca liste pomyslow', async () => {
    vi.mocked(prisma.rolkaIdea.findMany).mockResolvedValue([mockIdea]);
    const result = await getIdeas({});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Before/after laminacja');
  });
});

describe('scheduleIdea', () => {
  it('rzuca 409 gdy pomysl jest juz zaplanowany', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(mockPost);
    await expect(
      scheduleIdea('idea1', {
        title: 'Test',
        platform: 'IG',
        format: 'ROLKA',
        scheduledAt: new Date().toISOString(),
        status: 'POMYSL',
      })
    ).rejects.toThrow('Pomysl jest juz zaplanowany');
  });

  it('tworzy post gdy pomysl nie ma jeszcze posta', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.contentPost.create).mockResolvedValue(mockPost);
    const result = await scheduleIdea('idea1', {
      title: 'Test',
      platform: 'IG',
      format: 'ROLKA',
      scheduledAt: new Date().toISOString(),
      status: 'POMYSL',
    });
    expect(result).toBeDefined();
    expect(prisma.contentPost.create).toHaveBeenCalledOnce();
  });
});

describe('duplicateIdea', () => {
  it('tworzy kopie pomyslu bez plannedDate i bez relacji do posta', async () => {
    vi.mocked(prisma.rolkaIdea.findUnique).mockResolvedValue(mockIdea);
    const duplicated = { ...mockIdea, id: 'idea2', plannedDate: null };
    vi.mocked(prisma.rolkaIdea.create).mockResolvedValue(duplicated);
    const result = await duplicateIdea('idea1');
    expect(prisma.rolkaIdea.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'POMYSL',
          plannedDate: undefined,
        }),
      })
    );
    expect(result.id).toBe('idea2');
  });

  it('rzuca 404 gdy pomysl nie istnieje', async () => {
    vi.mocked(prisma.rolkaIdea.findUnique).mockResolvedValue(null);
    await expect(duplicateIdea('nieistniejace-id')).rejects.toThrow('Pomysl nie znaleziony');
  });
});
