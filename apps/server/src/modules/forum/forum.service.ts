// apps/server/src/modules/forum/forum.service.ts
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { getIO } from '../../socket';
import { createAndEmitNotification } from '../notifications/notifications.service';
import { sendPushToUser, sendPushToAdmins } from '../push/push.service';

// ─── Anonymity helpers ────────────────────────────────────────────────────────

const ANON_AUTHOR = { id: null, name: 'Anonim', avatarPath: null };

function maskAuthor(isAnonymous: boolean, isAdmin: boolean, author: any) {
  if (isAnonymous && !isAdmin) return ANON_AUTHOR;
  return author;
}

function detectsAdminMention(content: string): boolean {
  return /@admin/i.test(content);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async () => {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { threads: { where: { isDeleted: false } } } },
    },
  });

  return Promise.all(
    categories.map(async (cat) => {
      const [postCount, lastThread] = await Promise.all([
        prisma.forumPost.count({
          where: { thread: { categoryId: cat.id }, isDeleted: false },
        }),
        prisma.forumThread.findFirst({
          where: { categoryId: cat.id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select: { title: true, createdAt: true },
        }),
      ]);
      return { ...cat, postCount, lastThread };
    })
  );
};

export const createCategory = async (data: {
  name: string;
  slug: string;
  description?: string;
  order?: number;
}) => {
  return prisma.forumCategory.create({ data });
};

export const updateCategory = async (
  id: string,
  data: { name?: string; description?: string; order?: number }
) => {
  const cat = await prisma.forumCategory.findUnique({ where: { id } });
  if (!cat) throw new AppError('Kategoria nie istnieje', 404);
  return prisma.forumCategory.update({ where: { id }, data });
};

export const deleteCategory = async (id: string) => {
  const cat = await prisma.forumCategory.findUnique({
    where: { id },
    include: { _count: { select: { threads: true } } },
  });
  if (!cat) throw new AppError('Kategoria nie istnieje', 404);
  if (cat._count.threads > 0)
    throw new AppError('Nie można usunąć kategorii zawierającej wątki', 400);
  return prisma.forumCategory.delete({ where: { id } });
};

// ─── Threads ──────────────────────────────────────────────────────────────────

const THREAD_INCLUDE = {
  author: { select: { id: true, name: true, avatarPath: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { posts: { where: { isDeleted: false } } } },
};

export const getThreadsByCategory = async (
  slug: string,
  page: number,
  limit: number,
  sort: 'newest' | 'active' | 'popular',
  isAdmin = false
) => {
  const category = await prisma.forumCategory.findUnique({ where: { slug } });
  if (!category) throw new AppError('Kategoria nie istnieje', 404);

  const orderBy =
    sort === 'popular'
      ? { posts: { _count: 'desc' as const } }
      : sort === 'active'
      ? { updatedAt: 'desc' as const }
      : { createdAt: 'desc' as const };

  const where = { categoryId: category.id, isDeleted: false };
  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      include: THREAD_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, orderBy],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumThread.count({ where }),
  ]);

  const masked = await Promise.all(
    threads.map(async (t) => {
      const lastPost = await prisma.forumPost.findFirst({
        where: { threadId: t.id, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        select: {
          author: { select: { id: true, name: true } },
          createdAt: true,
          isAnonymous: true,
        },
      });
      return {
        ...t,
        author: maskAuthor(t.isAnonymous, isAdmin, t.author),
        lastPost: lastPost
          ? {
              author:
                lastPost.isAnonymous && !isAdmin
                  ? { name: 'Anonim' }
                  : lastPost.author,
              createdAt: lastPost.createdAt,
            }
          : null,
      };
    })
  );

  return { data: masked, totalPages: Math.ceil(total / limit) };
};

export const createThread = async (
  userId: string,
  data: { categoryId: string; title: string; content: string; isAnonymous: boolean; tags?: string[] }
) => {
  const category = await prisma.forumCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new AppError('Kategoria nie istnieje', 404);

  const rawTags = data.tags ?? [];
  const normalizedTags = rawTags
    .map((t: string) => t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter((t: string) => t.length > 0 && t.length <= 30);
  const tags = [...new Set(normalizedTags)].slice(0, 5);

  const thread = await prisma.forumThread.create({
    data: {
      title: data.title,
      content: data.content,
      isAnonymous: data.isAnonymous,
      authorId: userId,
      categoryId: data.categoryId,
      tags,
    },
    include: THREAD_INCLUDE,
  });

  // Auto-watch: author always observes their own thread
  await prisma.forumWatch.create({
    data: { userId, threadId: thread.id },
  });

  return thread;
};

export const getThread = async (
  threadId: string,
  page: number,
  limit: number,
  isAdmin = false,
  currentUserId?: string
) => {
  // Increment view count (non-blocking)
  prisma.forumThread.update({
    where: { id: threadId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  const thread = await prisma.forumThread.findFirst({
    where: { id: threadId, isDeleted: false },
    include: {
      author: { select: { id: true, name: true, avatarPath: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!thread) throw new AppError('Wątek nie istnieje', 404);

  const where = { threadId, isDeleted: false };
  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarPath: true,
            role: true,
            createdAt: true,
            _count: { select: { forumPosts: { where: { isDeleted: false } } } },
          },
        },
        reactions: {
          select: { userId: true, type: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumPost.count({ where }),
  ]);

  const maskedThread = {
    ...thread,
    author: maskAuthor(thread.isAnonymous, isAdmin, thread.author),
  };

  const maskedPosts = posts.map((p) => {
    const reactionTypes = ['LIKE', 'HEART', 'HELPFUL'] as const;
    const reactions = reactionTypes.reduce(
      (acc, type) => {
        const matching = p.reactions.filter((r) => r.type === type);
        acc[type] = {
          count: matching.length,
          reacted: currentUserId ? matching.some((r) => r.userId === currentUserId) : false,
        };
        return acc;
      },
      {} as Record<string, { count: number; reacted: boolean }>
    );

    return {
      ...p,
      author: maskAuthor(p.isAnonymous, isAdmin, p.author),
      reactions,
    };
  });

  return {
    thread: maskedThread,
    posts: { data: maskedPosts, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export const createPost = async (
  userId: string,
  threadId: string,
  content: string,
  isAnonymous: boolean,
  quotedPostId?: string,
  quotedContent?: string
) => {
  const thread = await prisma.forumThread.findFirst({
    where: { id: threadId, isDeleted: false },
  });
  if (!thread) throw new AppError('Wątek nie istnieje', 404);
  if (thread.isLocked) throw new AppError('Wątek jest zablokowany', 403);

  const mentionsAdmin = detectsAdminMention(content);

  const post = await prisma.forumPost.create({
    data: {
      content,
      isAnonymous,
      mentionsAdmin,
      authorId: userId,
      threadId,
      quotedPostId: quotedPostId ?? null,
      quotedContent: quotedContent ? quotedContent.slice(0, 300) : null,
    },
    include: { author: { select: { id: true, name: true, avatarPath: true, role: true } } },
  });

  // Update thread updatedAt for "active" sort
  await prisma.forumThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  // Notify watchers (exclude post author)
  const watchers = await prisma.forumWatch.findMany({
    where: { threadId },
    include: { user: { select: { id: true } } },
  });

  const io = getIO();
  for (const w of watchers) {
    if (w.userId === userId) continue; // skip self
    await createAndEmitNotification(io, {
      userId: w.userId,
      type: 'GENERIC',
      title: 'Nowa odpowiedź na forum',
      body: `Ktoś odpowiedział w wątku: ${thread.title}`,
      url: `/user/forum/watek/${threadId}`,
    });
    await sendPushToUser(w.userId, {
      title: 'Nowa odpowiedź na forum',
      body: `Ktoś odpowiedział w wątku: ${thread.title}`,
      url: `/user/forum/watek/${threadId}`,
    });
  }

  // Notify admins if @admin mentioned
  if (mentionsAdmin) {
    await sendPushToAdmins({
      title: 'Oznaczono @admin na forum',
      body: `Użytkownik prosi o pomoc w wątku: ${thread.title}`,
      url: `/admin/forum`,
    });

    // In-app notification to each admin
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await createAndEmitNotification(io, {
        userId: admin.id,
        type: 'GENERIC',
        title: 'Oznaczono @admin na forum',
        body: `Użytkownik prosi o pomoc w wątku: ${thread.title}`,
        url: `/admin/forum`,
      });
    }
  }

  return post;
};

// ─── Watch ────────────────────────────────────────────────────────────────────

export const toggleWatch = async (userId: string, threadId: string) => {
  const existing = await prisma.forumWatch.findFirst({ where: { userId, threadId } });
  if (existing) {
    await prisma.forumWatch.delete({ where: { id: existing.id } });
    return { watching: false };
  }
  await prisma.forumWatch.create({ data: { userId, threadId } });
  return { watching: true };
};

export const getWatchStatus = async (userId: string, threadId: string) => {
  const watch = await prisma.forumWatch.findFirst({ where: { userId, threadId } });
  return { watching: !!watch };
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────

export const softDeleteThread = async (userId: string, threadId: string, isAdmin: boolean) => {
  const thread = await prisma.forumThread.findFirst({ where: { id: threadId, isDeleted: false } });
  if (!thread) throw new AppError('Wątek nie istnieje', 404);
  if (!isAdmin && thread.authorId !== userId) throw new AppError('Brak uprawnień', 403);
  return prisma.forumThread.update({ where: { id: threadId }, data: { isDeleted: true } });
};

export const softDeletePost = async (userId: string, postId: string, isAdmin: boolean) => {
  const post = await prisma.forumPost.findFirst({ where: { id: postId, isDeleted: false } });
  if (!post) throw new AppError('Post nie istnieje', 404);
  if (!isAdmin && post.authorId !== userId) throw new AppError('Brak uprawnień', 403);
  return prisma.forumPost.update({ where: { id: postId }, data: { isDeleted: true } });
};

// ─── Admin moderation ─────────────────────────────────────────────────────────

export const pinThread = async (threadId: string) => {
  const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new AppError('Wątek nie istnieje', 404);
  return prisma.forumThread.update({
    where: { id: threadId },
    data: { isPinned: !thread.isPinned },
  });
};

export const lockThread = async (threadId: string) => {
  const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!thread) throw new AppError('Wątek nie istnieje', 404);
  return prisma.forumThread.update({
    where: { id: threadId },
    data: { isLocked: !thread.isLocked },
  });
};

export const moveThread = async (threadId: string, categoryId: string) => {
  const category = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError('Kategoria nie istnieje', 404);
  return prisma.forumThread.update({ where: { id: threadId }, data: { categoryId } });
};

export const getAdminThreads = async (
  filter: 'all' | 'admin-mention' | 'deleted' | 'pinned',
  page: number,
  limit: number
) => {
  const where =
    filter === 'admin-mention'
      ? { posts: { some: { mentionsAdmin: true, isDeleted: false } }, isDeleted: false }
      : filter === 'deleted'
      ? { isDeleted: true }
      : filter === 'pinned'
      ? { isPinned: true, isDeleted: false }
      : { isDeleted: false };

  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatarPath: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { posts: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumThread.count({ where }),
  ]);

  return { data: threads, totalPages: Math.ceil(total / limit) };
};
