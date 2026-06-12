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
  createPost,
  updatePost,
  deletePost,
  getIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
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
  karuzelaId: null,
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

describe('createPost', () => {
  it('tworzy nowy post', async () => {
    vi.mocked(prisma.contentPost.create).mockResolvedValue(mockPost);
    const result = await createPost({
      title: 'Test',
      platform: 'IG',
      format: 'ROLKA',
      scheduledAt: '2026-07-01T18:00:00Z',
      status: 'POMYSL',
    });
    expect(prisma.contentPost.create).toHaveBeenCalledOnce();
    expect(result.title).toBe('Test post');
  });
});

describe('updatePost', () => {
  it('rzuca 404 gdy post nie istnieje', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(null);
    await expect(updatePost('nonexistent', { title: 'New' })).rejects.toThrow('Publikacja nie znaleziona');
  });

  it('aktualizuje istniejacy post', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(mockPost);
    const updated = { ...mockPost, title: 'Updated' };
    vi.mocked(prisma.contentPost.update).mockResolvedValue(updated);
    const result = await updatePost('post1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });
});

describe('deletePost', () => {
  it('rzuca 404 gdy post nie istnieje', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(null);
    await expect(deletePost('nonexistent')).rejects.toThrow('Publikacja nie znaleziona');
  });

  it('usuwa istniejacy post', async () => {
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(mockPost);
    vi.mocked(prisma.contentPost.delete).mockResolvedValue(mockPost);
    await expect(deletePost('post1')).resolves.not.toThrow();
  });
});

describe('createIdea', () => {
  it('tworzy nowy pomysl', async () => {
    vi.mocked(prisma.rolkaIdea.create).mockResolvedValue(mockIdea);
    const result = await createIdea({
      title: 'Test',
      category: 'LAMINACJA',
      type: 'POV',
      status: 'POMYSL',
    });
    expect(prisma.rolkaIdea.create).toHaveBeenCalledOnce();
    expect(result.title).toBe('Before/after laminacja');
  });
});

describe('updateIdea', () => {
  it('rzuca 404 gdy pomysl nie istnieje', async () => {
    vi.mocked(prisma.rolkaIdea.findUnique).mockResolvedValue(null);
    await expect(updateIdea('nonexistent', { title: 'New' })).rejects.toThrow('Pomysl nie znaleziony');
  });
});

describe('deleteIdea', () => {
  it('rzuca 404 gdy pomysl nie istnieje', async () => {
    vi.mocked(prisma.rolkaIdea.findUnique).mockResolvedValue(null);
    await expect(deleteIdea('nonexistent')).rejects.toThrow('Pomysl nie znaleziony');
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
