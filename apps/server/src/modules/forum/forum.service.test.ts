// apps/server/src/modules/forum/forum.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    forumCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    forumThread: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    forumPost: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    forumWatch: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../socket', () => ({
  getIO: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
}));

vi.mock('../notifications/notifications.service', () => ({
  createAndEmitNotification: vi.fn().mockResolvedValue({}),
}));

vi.mock('../push/push.service', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
  sendPushToAdmins: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../config/prisma';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser, sendPushToAdmins } from '../push/push.service';
import {
  getCategories,
  getThreadsByCategory,
  createThread,
  getThread,
  createPost,
  toggleWatch,
  getWatchStatus,
  softDeleteThread,
  softDeletePost,
  pinThread,
  lockThread,
  moveThread,
  deleteCategory,
} from './forum.service';

const mockCategory = {
  id: 'cat1',
  name: 'Pielęgnacja stóp',
  slug: 'pielegnacja-stop',
  description: 'Problemy, sposoby, porady',
  order: 0,
  createdAt: new Date(),
};

const mockUser = { id: 'u1', name: 'Kasia M.', avatarPath: null, role: 'USER' };
const mockAdminUser = { id: 'admin1', name: 'Admin', role: 'ADMIN' };

const mockThread = {
  id: 'th1',
  title: 'Test thread',
  content: 'Content',
  isAnonymous: false,
  isPinned: false,
  isLocked: false,
  isDeleted: false,
  authorId: 'u1',
  author: mockUser,
  categoryId: 'cat1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPost = {
  id: 'p1',
  content: 'Reply content',
  isAnonymous: false,
  isDeleted: false,
  mentionsAdmin: false,
  authorId: 'u1',
  author: mockUser,
  threadId: 'th1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCategories', () => {
  it('returns categories ordered by order field', async () => {
    vi.mocked(prisma.forumCategory.findMany).mockResolvedValue([mockCategory] as any);
    const result = await getCategories();
    expect(prisma.forumCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: 'asc' } })
    );
    expect(result).toEqual([mockCategory]);
  });
});

describe('createThread', () => {
  it('creates thread and auto-watches for author', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(prisma.forumThread.create).mockResolvedValue(mockThread as any);
    vi.mocked(prisma.forumWatch.create).mockResolvedValue({} as any);

    await createThread('u1', { categoryId: 'cat1', title: 'Test', content: 'Content', isAnonymous: false });

    expect(prisma.forumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ authorId: 'u1', categoryId: 'cat1' }),
      })
    );
    expect(prisma.forumWatch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) })
    );
  });

  it('throws 404 when category not found', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(null);
    await expect(
      createThread('u1', { categoryId: 'bad-id', title: 'T', content: 'C', isAnonymous: false })
    ).rejects.toThrow('Kategoria nie istnieje');
  });
});

describe('createPost', () => {
  it('detects @admin mention and sets mentionsAdmin=true', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, isLocked: false } as any);
    vi.mocked(prisma.forumPost.create).mockResolvedValue({ ...mockPost, mentionsAdmin: true } as any);
    vi.mocked(prisma.forumWatch.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockAdminUser] as any);

    await createPost('u1', 'th1', 'Hej @admin potrzebuję pomocy', false);

    expect(prisma.forumPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mentionsAdmin: true }),
      })
    );
  });

  it('sends push to admins when @admin mentioned', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, isLocked: false } as any);
    vi.mocked(prisma.forumPost.create).mockResolvedValue({ ...mockPost, mentionsAdmin: true } as any);
    vi.mocked(prisma.forumWatch.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockAdminUser] as any);

    await createPost('u1', 'th1', 'Hej @admin potrzebuję pomocy', false);

    expect(sendPushToAdmins).toHaveBeenCalled();
  });

  it('throws 403 when thread is locked', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, isLocked: true } as any);
    await expect(createPost('u1', 'th1', 'Reply', false)).rejects.toThrow('Wątek jest zablokowany');
  });

  it('notifies watchers (excluding post author) on new reply', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, isLocked: false } as any);
    vi.mocked(prisma.forumPost.create).mockResolvedValue(mockPost as any);
    const watcher = { userId: 'u2', user: { id: 'u2' } };
    vi.mocked(prisma.forumWatch.findMany).mockResolvedValue([watcher] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await createPost('u1', 'th1', 'Reply without admin', false);

    expect(sendPushToUser).toHaveBeenCalledWith('u2', expect.any(Object));
  });

  it('does NOT notify the post author about their own reply', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, isLocked: false } as any);
    vi.mocked(prisma.forumPost.create).mockResolvedValue(mockPost as any);
    const selfWatch = { userId: 'u1', user: { id: 'u1' } };
    vi.mocked(prisma.forumWatch.findMany).mockResolvedValue([selfWatch] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await createPost('u1', 'th1', 'My own reply', false);

    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});

describe('toggleWatch', () => {
  it('creates watch when not watching', async () => {
    vi.mocked(prisma.forumWatch.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.forumWatch.create).mockResolvedValue({} as any);

    const result = await toggleWatch('u1', 'th1');

    expect(prisma.forumWatch.create).toHaveBeenCalled();
    expect(result).toEqual({ watching: true });
  });

  it('deletes watch when already watching', async () => {
    vi.mocked(prisma.forumWatch.findFirst).mockResolvedValue({ id: 'w1' } as any);
    vi.mocked(prisma.forumWatch.delete).mockResolvedValue({} as any);

    const result = await toggleWatch('u1', 'th1');

    expect(prisma.forumWatch.delete).toHaveBeenCalled();
    expect(result).toEqual({ watching: false });
  });
});

describe('softDeleteThread', () => {
  it('allows owner to soft-delete their thread', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue(mockThread as any);
    vi.mocked(prisma.forumThread.update).mockResolvedValue({ ...mockThread, isDeleted: true } as any);

    await softDeleteThread('u1', 'th1', false);

    expect(prisma.forumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDeleted: true } })
    );
  });

  it('throws 403 when non-owner non-admin tries to delete', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, authorId: 'other' } as any);
    await expect(softDeleteThread('u1', 'th1', false)).rejects.toThrow();
  });

  it('allows admin to delete any thread', async () => {
    vi.mocked(prisma.forumThread.findFirst).mockResolvedValue({ ...mockThread, authorId: 'other' } as any);
    vi.mocked(prisma.forumThread.update).mockResolvedValue({ ...mockThread, isDeleted: true } as any);
    await softDeleteThread('u1', 'th1', true);
    expect(prisma.forumThread.update).toHaveBeenCalled();
  });
});

describe('pinThread / lockThread', () => {
  it('toggles isPinned on thread', async () => {
    vi.mocked(prisma.forumThread.findUnique).mockResolvedValue(mockThread as any);
    vi.mocked(prisma.forumThread.update).mockResolvedValue({ ...mockThread, isPinned: true } as any);

    await pinThread('th1');

    expect(prisma.forumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPinned: true } })
    );
  });

  it('toggles isLocked on thread', async () => {
    vi.mocked(prisma.forumThread.findUnique).mockResolvedValue(mockThread as any);
    vi.mocked(prisma.forumThread.update).mockResolvedValue({ ...mockThread, isLocked: true } as any);

    await lockThread('th1');

    expect(prisma.forumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isLocked: true } })
    );
  });
});

describe('getWatchStatus', () => {
  it('returns watching:true when watch exists', async () => {
    vi.mocked(prisma.forumWatch.findFirst).mockResolvedValue({ id: 'w1' } as any);
    const result = await getWatchStatus('u1', 'th1');
    expect(result).toEqual({ watching: true });
  });

  it('returns watching:false when no watch', async () => {
    vi.mocked(prisma.forumWatch.findFirst).mockResolvedValue(null);
    const result = await getWatchStatus('u1', 'th1');
    expect(result).toEqual({ watching: false });
  });
});

describe('getThreadsByCategory', () => {
  it('returns paginated threads with anonymity masking', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(mockCategory as any);
    const anonThread = { ...mockThread, isAnonymous: true, author: mockUser };
    vi.mocked(prisma.forumThread.findMany).mockResolvedValue([anonThread] as any);
    vi.mocked(prisma.forumThread.count).mockResolvedValue(1);

    const result = await getThreadsByCategory('pielegnacja-stop', 1, 20, 'newest', false);

    expect(result.data[0].author).toEqual({ id: null, name: 'Anonim', avatarPath: null });
    expect(result.totalPages).toBe(1);
  });

  it('throws 404 when category not found', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(null);
    await expect(getThreadsByCategory('nope', 1, 20, 'newest')).rejects.toThrow('Kategoria nie istnieje');
  });
});

describe('moveThread', () => {
  it('throws 404 when target category not found', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(null);
    await expect(moveThread('th1', 'bad-cat')).rejects.toThrow('Kategoria nie istnieje');
  });

  it('updates thread categoryId on success', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(prisma.forumThread.update).mockResolvedValue({ ...mockThread, categoryId: 'cat2' } as any);

    await moveThread('th1', 'cat2');

    expect(prisma.forumThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { categoryId: 'cat2' } })
    );
  });
});

describe('deleteCategory', () => {
  it('throws 400 when category has threads', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue({
      ...mockCategory,
      _count: { threads: 3 },
    } as any);
    await expect(deleteCategory('cat1')).rejects.toThrow('Nie można usunąć kategorii zawierającej wątki');
  });

  it('deletes category when empty', async () => {
    vi.mocked(prisma.forumCategory.findUnique).mockResolvedValue({
      ...mockCategory,
      _count: { threads: 0 },
    } as any);
    vi.mocked(prisma.forumCategory.delete).mockResolvedValue(mockCategory as any);

    await deleteCategory('cat1');

    expect(prisma.forumCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
  });
});
