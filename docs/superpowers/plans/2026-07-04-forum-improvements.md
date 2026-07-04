# Forum Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the COSMO forum from a minimal MVP to a fully-featured cosmetic forum with reactions, tags, quotes, search, user profiles, view counts, and richer UI.

**Architecture:** Backend-first: Prisma migration → service layer extensions → controller/router additions → frontend API layer → component rewrites and new pages. All forum routes remain authenticated. New `ForumReaction` model and enum added to schema.

**Tech Stack:** Prisma + PostgreSQL, Express 5, React 19, TypeScript, Tailwind CSS, Vitest (tests), react-router-dom v7

**Spec:** `docs/superpowers/specs/2026-07-04-forum-improvements-design.md`

---

## File Map

### Backend — Modified
- `apps/server/prisma/schema.prisma` — add fields to ForumThread, ForumPost, ForumCategory; add ForumReaction model + ReactionType enum
- `apps/server/src/modules/forum/forum.service.ts` — extend existing functions, add new ones
- `apps/server/src/modules/forum/forum.controller.ts` — add handlers for new endpoints
- `apps/server/src/modules/forum/forum.router.ts` — register new routes
- `apps/server/src/modules/forum/forum.service.test.ts` — add tests for new service functions

### Frontend — Modified
- `apps/web/src/api/forum.api.ts` — add new API methods, update types
- `apps/web/src/pages/user/forum/ForumHome.tsx` — full redesign
- `apps/web/src/pages/user/forum/ForumCategory.tsx` — richer thread cards
- `apps/web/src/pages/user/forum/ForumThread.tsx` — reactions, quotes, user rank
- `apps/web/src/pages/user/forum/ForumNewThread.tsx` — add tags field

### Frontend — Created
- `apps/web/src/pages/user/forum/ForumSearch.tsx` — new search page
- `apps/web/src/pages/user/forum/ForumUserProfile.tsx` — new user profile page

### Frontend — Router
- `apps/web/src/router.tsx` — register ForumSearch and ForumUserProfile routes

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to ForumCategory**

Open `apps/server/prisma/schema.prisma`. In the `ForumCategory` model, add after the `order` field:
```prisma
  icon        String?
  color       String?
```

- [ ] **Step 2: Add new fields to ForumThread**

In the `ForumThread` model, add after `isDeleted`:
```prisma
  viewCount   Int           @default(0)
  tags        String[]
```

- [ ] **Step 3: Add new fields to ForumPost**

In the `ForumPost` model, add after `mentionsAdmin`:
```prisma
  quotedPostId   String?
  quotedContent  String?
  reactions      ForumReaction[]
```

- [ ] **Step 4: Add ReactionType enum and ForumReaction model**

Add after the `ForumWatch` model:
```prisma
enum ReactionType {
  LIKE
  HEART
  HELPFUL
}

model ForumReaction {
  id        String       @id @default(cuid())
  userId    String
  postId    String
  type      ReactionType
  createdAt DateTime     @default(now())
  user      User         @relation("ForumReactionUser", fields: [userId], references: [id], onDelete: Cascade)
  post      ForumPost    @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([userId, postId, type])
  @@index([postId])
}
```

- [ ] **Step 5: Add User relation for ForumReaction**

In the `User` model, add to the relations section:
```prisma
  forumReactions ForumReaction[] @relation("ForumReactionUser")
```

- [ ] **Step 6: Run migration**

```bash
cd cosmo-app/apps/server
npx prisma migrate dev --name forum_reactions_tags_views
npx prisma generate
```

Expected: Migration created successfully, Prisma Client regenerated.

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/server/prisma/
git commit -m "feat(forum): add reactions, tags, viewCount, quote fields to schema"
```

---

## Task 2: Backend Service — Extend Existing Functions

**Files:**
- Modify: `apps/server/src/modules/forum/forum.service.ts`

- [ ] **Step 1: Update `getCategories` to include postCount and lastThread**

Replace the `getCategories` function body:
```typescript
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
```

- [ ] **Step 2: Update `getThreadsByCategory` to include tags, viewCount, lastPost**

Update the `THREAD_INCLUDE` constant and the return mapping:
```typescript
const THREAD_INCLUDE = {
  author: { select: { id: true, name: true, avatarPath: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { posts: { where: { isDeleted: false } } } },
};
```

After fetching threads in `getThreadsByCategory`, add `lastPost` lookup:
```typescript
  const masked = await Promise.all(
    threads.map(async (t) => {
      const lastPost = await prisma.forumPost.findFirst({
        where: { threadId: t.id, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        select: { author: { select: { id: true, name: true } }, createdAt: true, isAnonymous: true },
      });
      return {
        ...t,
        author: maskAuthor(t.isAnonymous, isAdmin, t.author),
        lastPost: lastPost
          ? {
              author: lastPost.isAnonymous && !isAdmin
                ? { name: 'Anonim' }
                : lastPost.author,
              createdAt: lastPost.createdAt,
            }
          : null,
      };
    })
  );
```

- [ ] **Step 3: Update `createThread` to accept and normalize tags**

In `createThread`, after extracting `data`, add tag normalization before the `prisma.forumThread.create` call:
```typescript
  const normalizedTags = (data.tags ?? [])
    .map((t: string) => t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter((t: string) => t.length > 0 && t.length <= 30)
    .slice(0, 5);

  // Deduplicate
  const tags = [...new Set(normalizedTags)];
```

Update the `prisma.forumThread.create` data to include `tags`:
```typescript
    data: {
      title: data.title,
      content: data.content,
      isAnonymous: data.isAnonymous,
      authorId: userId,
      categoryId: data.categoryId,
      tags,
    },
```

Also add parameter type update for the function signature:
```typescript
export const createThread = async (
  userId: string,
  data: { categoryId: string; title: string; content: string; isAnonymous: boolean; tags?: string[] }
) => {
```

- [ ] **Step 4: Update `createPost` to accept quotedPostId and quotedContent**

Update the `createPost` function signature:
```typescript
export const createPost = async (
  userId: string,
  threadId: string,
  content: string,
  isAnonymous: boolean,
  quotedPostId?: string,
  quotedContent?: string
) => {
```

In the `prisma.forumPost.create` data, add:
```typescript
      quotedPostId: quotedPostId ?? null,
      quotedContent: quotedContent ? quotedContent.slice(0, 300) : null,
```

- [ ] **Step 5: Update `getThread` to increment viewCount and return reactions**

At the start of `getThread`, add the viewCount increment (before the thread fetch):
```typescript
  // Increment view count
  await prisma.forumThread.update({
    where: { id: threadId },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {}); // Non-blocking, ignore if thread not found yet
```

Update the posts query to include reactions and author stats:
```typescript
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
```

After fetching posts, add a helper to shape reactions (add `currentUserId` parameter to `getThread`):

Update `getThread` signature:
```typescript
export const getThread = async (
  threadId: string,
  page: number,
  limit: number,
  isAdmin = false,
  currentUserId?: string
) => {
```

Add reaction shaping after posts fetch:
```typescript
  const maskedPosts = posts.map((p) => {
    const reactionTypes = ['LIKE', 'HEART', 'HELPFUL'] as const;
    const reactions = reactionTypes.reduce((acc, type) => {
      const matching = p.reactions.filter((r) => r.type === type);
      acc[type] = {
        count: matching.length,
        reacted: currentUserId ? matching.some((r) => r.userId === currentUserId) : false,
      };
      return acc;
    }, {} as Record<string, { count: number; reacted: boolean }>);

    return {
      ...p,
      author: maskAuthor(p.isAnonymous, isAdmin, p.author),
      reactions,
    };
  });
```

Also return `viewCount` and `tags` in the thread object (already present after schema migration).

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/forum/forum.service.ts
git commit -m "feat(forum): extend service functions with tags, viewCount, quotes, reactions"
```

---

## Task 3: Backend Service — New Functions

**Files:**
- Modify: `apps/server/src/modules/forum/forum.service.ts`

- [ ] **Step 1: Add `reactToPost` function**

Append to `forum.service.ts`:
```typescript
// ─── Reactions ────────────────────────────────────────────────────────────────

type ReactionTypeStr = 'LIKE' | 'HEART' | 'HELPFUL';

export const reactToPost = async (userId: string, postId: string, type: ReactionTypeStr) => {
  const post = await prisma.forumPost.findFirst({ where: { id: postId, isDeleted: false } });
  if (!post) throw new AppError('Post nie istnieje', 404);

  const existing = await prisma.forumReaction.findFirst({
    where: { userId, postId, type },
  });

  if (existing) {
    await prisma.forumReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumReaction.create({ data: { userId, postId, type } });
  }

  const allReactions = await prisma.forumReaction.findMany({ where: { postId } });
  const counts = (['LIKE', 'HEART', 'HELPFUL'] as const).reduce((acc, t) => {
    acc[t] = allReactions.filter((r) => r.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  return {
    reacted: !existing,
    type,
    counts,
  };
};
```

- [ ] **Step 2: Add `searchThreads` function**

```typescript
// ─── Search ───────────────────────────────────────────────────────────────────

export const searchThreads = async (
  q: string,
  tags: string[],
  categoryId: string | undefined,
  page: number,
  limit: number
) => {
  if (q.length < 2) throw new AppError('Wpisz co najmniej 2 znaki', 400);

  const where: any = {
    isDeleted: false,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
    ],
  };
  if (tags.length > 0) where.tags = { hasSome: tags };
  if (categoryId) where.categoryId = categoryId;

  const [threads, total] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      include: THREAD_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumThread.count({ where }),
  ]);

  const data = threads.map((t) => ({
    ...t,
    author: maskAuthor(t.isAnonymous, false, t.author),
  }));

  return { data, totalPages: Math.ceil(total / limit), total };
};
```

- [ ] **Step 3: Add `getPopularTags` function**

```typescript
// ─── Tags ─────────────────────────────────────────────────────────────────────

export const getPopularTags = async (): Promise<{ tag: string; count: number }[]> => {
  const result = await prisma.$queryRaw<{ tag: string; count: bigint }[]>`
    SELECT unnest(tags) as tag, COUNT(*) as count
    FROM "ForumThread"
    WHERE "isDeleted" = false
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 20
  `;
  return result.map((r) => ({ tag: r.tag, count: Number(r.count) }));
};
```

- [ ] **Step 4: Add `getUserThreads` function**

```typescript
// ─── User profile ─────────────────────────────────────────────────────────────

export const getUserThreads = async (userId: string, page: number, limit: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarPath: true, createdAt: true },
  });
  if (!user) throw new AppError('Użytkownik nie istnieje', 404);

  const where = { authorId: userId, isAnonymous: false, isDeleted: false };
  const [threads, total, postCount] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { posts: { where: { isDeleted: false } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumThread.count({ where }),
    prisma.forumPost.count({ where: { authorId: userId, isAnonymous: false, isDeleted: false } }),
  ]);

  return { user, postCount, data: threads, totalPages: Math.ceil(total / limit) };
};
```

- [ ] **Step 5: Add `getForumStats` function**

```typescript
// ─── Stats ────────────────────────────────────────────────────────────────────

export const getForumStats = async () => {
  const [threadCount, postCount, userCountResult] = await Promise.all([
    prisma.forumThread.count({ where: { isDeleted: false } }),
    prisma.forumPost.count({ where: { isDeleted: false } }),
    prisma.forumPost.groupBy({
      by: ['authorId'],
      where: { isAnonymous: false, isDeleted: false },
    }),
  ]);
  return { threadCount, postCount, userCount: userCountResult.length };
};
```

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/forum/forum.service.ts
git commit -m "feat(forum): add reactToPost, searchThreads, getPopularTags, getUserThreads, getForumStats"
```

---

## Task 4: Backend Controller and Router

**Files:**
- Modify: `apps/server/src/modules/forum/forum.controller.ts`
- Modify: `apps/server/src/modules/forum/forum.router.ts`

- [ ] **Step 1: Add new controller handlers**

In `forum.controller.ts`, add the following handlers to the `forumController` object:
```typescript
  // ─── Reactions ───────────────────────────────────────────────────────────────
  reactToPost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { type } = req.body;
      if (!['LIKE', 'HEART', 'HELPFUL'].includes(type)) {
        return res.status(400).json({ message: 'Nieprawidłowy typ reakcji' });
      }
      const data = await forumService.reactToPost(userId, req.params.id, type);
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── Search ──────────────────────────────────────────────────────────────────
  searchThreads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) ?? '';
      const tags = req.query.tags
        ? (req.query.tags as string).split(',').filter(Boolean)
        : [];
      const categoryId = req.query.categoryId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await forumService.searchThreads(q, tags, categoryId, page, limit);
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── Tags ────────────────────────────────────────────────────────────────────
  getPopularTags: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.getPopularTags();
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── User profile ─────────────────────────────────────────────────────────────
  getUserThreads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await forumService.getUserThreads(req.params.userId, page, limit);
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── Stats ───────────────────────────────────────────────────────────────────
  getForumStats: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.getForumStats();
      res.json(data);
    } catch (err) { next(err); }
  },
```

- [ ] **Step 2: Update `getThread` controller to pass currentUserId**

In the `getThread` handler, update the service call:
```typescript
      const data = await forumService.getThread(req.params.id, page, limit, isAdmin, req.user?.id);
```

- [ ] **Step 3: Update `createPost` controller to pass quote fields**

In the `createPost` handler, extract the new fields:
```typescript
      const { content, isAnonymous: anonRaw, quotedPostId, quotedContent } = req.body;
      const isAnonymous = anonRaw === true;
      const data = await forumService.createPost(userId, req.params.id, content, isAnonymous, quotedPostId, quotedContent);
```

- [ ] **Step 4: Register new routes in forum.router.ts**

Add these routes in the appropriate sections:
```typescript
// ─── Search & Tags ────────────────────────────────────────────────────────────
router.get('/search', c.searchThreads);
router.get('/tags', c.getPopularTags);
router.get('/stats', c.getForumStats);

// ─── User profile ─────────────────────────────────────────────────────────────
router.get('/users/:userId/threads', c.getUserThreads);

// ─── Reactions ────────────────────────────────────────────────────────────────
router.post('/posts/:id/react', c.reactToPost);
```

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/forum/forum.controller.ts apps/server/src/modules/forum/forum.router.ts
git commit -m "feat(forum): add controller handlers and routes for reactions, search, tags, stats, profiles"
```

---

## Task 5: Backend Tests

**Files:**
- Modify: `apps/server/src/modules/forum/forum.service.test.ts`

- [ ] **Step 1: Add mock for forumReaction to the vi.mock block**

In the existing `vi.mock('../../config/prisma', ...)` call, add inside the `prisma` object:
```typescript
    forumReaction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
```

- [ ] **Step 2: Add imports for new service functions**

Add to the import line from `./forum.service`:
```typescript
import {
  // ... existing imports ...
  reactToPost,
  searchThreads,
  getPopularTags,
  getUserThreads,
  getForumStats,
} from './forum.service';
```

- [ ] **Step 3: Write test for `reactToPost` — toggle on**

```typescript
describe('reactToPost', () => {
  const mockPost = { id: 'p1', content: 'x', isDeleted: false };

  it('creates reaction when none exists (toggle on)', async () => {
    vi.mocked(prisma.forumPost.findFirst).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.forumReaction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.forumReaction.create).mockResolvedValue({} as any);
    vi.mocked(prisma.forumReaction.findMany).mockResolvedValue([
      { type: 'LIKE', userId: 'u1' },
    ] as any);

    const result = await reactToPost('u1', 'p1', 'LIKE');

    expect(prisma.forumReaction.create).toHaveBeenCalled();
    expect(result.reacted).toBe(true);
    expect(result.counts.LIKE).toBe(1);
  });

  it('deletes reaction when it exists (toggle off)', async () => {
    vi.mocked(prisma.forumPost.findFirst).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.forumReaction.findFirst).mockResolvedValue({ id: 'r1', type: 'LIKE' } as any);
    vi.mocked(prisma.forumReaction.delete).mockResolvedValue({} as any);
    vi.mocked(prisma.forumReaction.findMany).mockResolvedValue([] as any);

    const result = await reactToPost('u1', 'p1', 'LIKE');

    expect(prisma.forumReaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(result.reacted).toBe(false);
    expect(result.counts.LIKE).toBe(0);
  });

  it('throws 404 for deleted post', async () => {
    vi.mocked(prisma.forumPost.findFirst).mockResolvedValue(null);
    await expect(reactToPost('u1', 'bad', 'LIKE')).rejects.toThrow('Post nie istnieje');
  });
});
```

- [ ] **Step 4: Write test for `searchThreads`**

```typescript
describe('searchThreads', () => {
  it('throws 400 when query is too short', async () => {
    await expect(searchThreads('a', [], undefined, 1, 20)).rejects.toThrow('Wpisz co najmniej 2 znaki');
  });

  it('returns paginated results for valid query', async () => {
    vi.mocked(prisma.forumThread.findMany).mockResolvedValue([mockThread] as any);
    vi.mocked(prisma.forumThread.count).mockResolvedValue(1);

    const result = await searchThreads('retinol', [], undefined, 1, 20);

    expect(prisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      })
    );
    expect(result.data).toHaveLength(1);
    expect(result.totalPages).toBe(1);
    expect(result.total).toBe(1);
  });
});
```

- [ ] **Step 5: Write test for `getUserThreads`**

```typescript
describe('getUserThreads', () => {
  it('throws 404 for nonexistent user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getUserThreads('bad-id', 1, 10)).rejects.toThrow('Użytkownik nie istnieje');
  });

  it('returns user threads and postCount', async () => {
    const user = { id: 'u1', name: 'Kasia', avatarPath: null, createdAt: new Date() };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any);
    vi.mocked(prisma.forumThread.findMany).mockResolvedValue([mockThread] as any);
    vi.mocked(prisma.forumThread.count).mockResolvedValue(1);
    vi.mocked(prisma.forumPost.count).mockResolvedValue(42);

    const result = await getUserThreads('u1', 1, 10);

    expect(result.user).toEqual(user);
    expect(result.postCount).toBe(42);
    expect(result.data).toHaveLength(1);
  });
});
```

Note: `mockThread` is already defined in the existing test file at the top.
Note: You may need to add `user.findUnique` to the prisma mock if not already present:
```typescript
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(), // add this
    },
```

- [ ] **Step 6: Run the tests**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/forum/forum.service.test.ts
```

Expected: All tests pass (including existing ones).

- [ ] **Step 7: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/forum/forum.service.test.ts
git commit -m "test(forum): add tests for reactToPost, searchThreads, getUserThreads"
```

---

## Task 6: Frontend API Layer

**Files:**
- Modify: `apps/web/src/api/forum.api.ts`

- [ ] **Step 1: Update type definitions**

Replace/extend the existing types at the top of `forum.api.ts`:

```typescript
export interface ForumAuthor {
  id: string | null;
  name: string;
  avatarPath: string | null;
  createdAt?: string;
  _count?: { forumPosts: number };
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  _count?: { threads: number };
  postCount?: number;
  lastThread?: { title: string; createdAt: string } | null;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  isPinned: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  tags: string[];
  viewCount: number;
  mentionsAdmin?: boolean;
  author: ForumAuthor;
  category: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
  lastPost?: { author: { name: string }; createdAt: string } | null;
}

export interface ReactionCounts {
  LIKE: { count: number; reacted: boolean };
  HEART: { count: number; reacted: boolean };
  HELPFUL: { count: number; reacted: boolean };
}

export interface ForumPost {
  id: string;
  content: string;
  isAnonymous: boolean;
  isDeleted: boolean;
  mentionsAdmin: boolean;
  quotedPostId: string | null;
  quotedContent: string | null;
  author: ForumAuthor;
  threadId: string;
  createdAt: string;
  updatedAt: string;
  reactions: ReactionCounts;
}

export interface ForumTag {
  tag: string;
  count: number;
}

export interface ForumStats {
  threadCount: number;
  postCount: number;
  userCount: number;
}

export interface ForumUserProfile {
  user: { id: string; name: string; avatarPath: string | null; createdAt: string };
  postCount: number;
  data: ForumThread[];
  totalPages: number;
}
```

- [ ] **Step 2: Add new API methods**

Add to the `forumApi` object:
```typescript
  // Search
  search: async (params: {
    q: string;
    tags?: string[];
    categoryId?: string;
    page?: number;
  }): Promise<PaginatedResponse<ForumThread> & { total: number }> => {
    const res = await api.get('/forum/search', {
      params: { ...params, tags: params.tags?.join(',') },
    });
    return res.data;
  },

  // Tags
  getPopularTags: async (): Promise<ForumTag[]> => {
    const res = await api.get('/forum/tags');
    return res.data;
  },

  // Stats
  getStats: async (): Promise<ForumStats> => {
    const res = await api.get('/forum/stats');
    return res.data;
  },

  // User profile
  getUserThreads: async (
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ForumUserProfile> => {
    const res = await api.get(`/forum/users/${userId}/threads`, { params });
    return res.data;
  },

  // Reactions
  reactToPost: async (
    postId: string,
    type: 'LIKE' | 'HEART' | 'HELPFUL',
  ): Promise<{ reacted: boolean; type: string; counts: Record<string, number> }> => {
    const res = await api.post(`/forum/posts/${postId}/react`, { type });
    return res.data;
  },
```

- [ ] **Step 3: Update `createPost` to accept quote params**

Update the existing `createPost` method:
```typescript
  createPost: async (
    threadId: string,
    data: { content: string; isAnonymous?: boolean; quotedPostId?: string; quotedContent?: string },
  ): Promise<ForumPost> => {
    const res = await api.post(`/forum/threads/${threadId}/posts`, data);
    return res.data;
  },
```

- [ ] **Step 4: Update `createThread` to accept tags**

Update the existing `createThread` method:
```typescript
  createThread: async (data: {
    title: string;
    content: string;
    categoryId: string;
    isAnonymous?: boolean;
    tags?: string[];
  }): Promise<ForumThread> => {
    const res = await api.post('/forum/threads', data);
    return res.data;
  },
```

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/api/forum.api.ts
git commit -m "feat(forum): update API types and methods for reactions, search, tags, quotes"
```

---

## Task 7: ForumHome Redesign

**Files:**
- Modify: `apps/web/src/pages/user/forum/ForumHome.tsx`

- [ ] **Step 1: Rewrite ForumHome.tsx**

Replace the entire file content with:
```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forumApi, ForumCategory, ForumStats } from '@/api/forum.api';

function getRankLabel(postCount: number): string {
  if (postCount >= 200) return 'Kosmetolog-Entuzjastka';
  if (postCount >= 50) return 'Ekspert';
  if (postCount >= 10) return 'Bywalec';
  return 'Nowicjusz';
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min. temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

export function ForumHome() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([forumApi.getCategories(), forumApi.getStats()])
      .then(([cats, s]) => {
        setCategories(cats);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/user/forum/szukaj?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-8">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Forum Kosmetyczne</h1>
        <p className="text-sm text-gray-500 mt-1">Zadaj pytanie, podziel się doświadczeniem</p>
        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj na forum..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            type="submit"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Szukaj
          </button>
          <Link
            to="/user/forum/nowy"
            className="bg-white border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
          >
            + Nowy wątek
          </Link>
        </form>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/user/forum/${cat.slug}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: cat.color ?? '#f3e8ff' }}
              >
                {cat.icon ?? '💬'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800">{cat.name}</h2>
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                )}
                {cat.lastThread && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    Ostatni: {cat.lastThread.title} · {getRelativeTime(cat.lastThread.createdAt)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-semibold text-purple-600">{cat._count?.threads ?? 0}</p>
                <p className="text-xs text-gray-400">wątków</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">{cat.postCount ?? 0}</p>
                <p className="text-xs text-gray-400">postów</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="mt-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Razem:{' '}
            <span className="text-gray-600 font-medium">{stats.threadCount.toLocaleString('pl-PL')} wątków</span>
            {' · '}
            <span className="text-gray-600 font-medium">{stats.postCount.toLocaleString('pl-PL')} postów</span>
            {' · '}
            <span className="text-gray-600 font-medium">{stats.userCount.toLocaleString('pl-PL')} użytkowników</span>
          </p>
        </div>
      )}
    </div>
  );
}

export { getRankLabel, getRelativeTime };
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumHome.tsx
git commit -m "feat(forum): redesign ForumHome with search bar, category icons, stats footer"
```

---

## Task 8: ForumCategory Redesign

**Files:**
- Modify: `apps/web/src/pages/user/forum/ForumCategory.tsx`

- [ ] **Step 1: Rewrite ForumCategory.tsx**

Replace the entire file with:
```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forumApi, ForumThread } from '@/api/forum.api';
import { getRelativeTime } from './ForumHome';

type SortType = 'newest' | 'active' | 'popular';

function isHot(thread: ForumThread): boolean {
  const posts = thread._count?.posts ?? 0;
  const updatedRecently = Date.now() - new Date(thread.updatedAt).getTime() < 24 * 60 * 60 * 1000;
  return posts > 20 || updatedRecently;
}

function ForumThreadCard({ thread }: { thread: ForumThread }) {
  const navigate = useNavigate();
  return (
    <Link
      to={`/user/forum/watek/${thread.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isHot(thread) && (
              <span className="text-xs">🔥</span>
            )}
            {thread.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Przypięty</span>
            )}
            {thread.isLocked && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Zamknięty</span>
            )}
          </div>
          <h3 className="font-medium text-gray-800 leading-snug">{thread.title}</h3>

          {/* Tags */}
          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {thread.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/user/forum/szukaj?tags=${encodeURIComponent(tag)}`);
                  }}
                  className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
            <span>{thread.author.name}</span>
            <span>·</span>
            <span>{new Date(thread.createdAt).toLocaleDateString('pl-PL')}</span>
            <span>·</span>
            <span>{thread._count?.posts ?? 0} odpowiedzi</span>
            <span>·</span>
            <span>👁 {thread.viewCount}</span>
          </div>

          {thread.lastPost && (
            <p className="text-xs text-gray-400 mt-1">
              Ostatnia odpowiedź: <span className="text-gray-600">{thread.lastPost.author.name}</span>
              {' · '}{getRelativeTime(thread.lastPost.createdAt)}
            </p>
          )}
          {!thread.lastPost && thread._count?.posts === 0 && (
            <p className="text-xs text-gray-300 mt-1">Brak odpowiedzi</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ForumCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [sort, setSort] = useState<SortType>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    forumApi.getThreadsByCategory(categorySlug, { page, limit: 20, sort })
      .then((res) => {
        setThreads(res.data);
        setTotalPages(res.totalPages);
        if (res.data.length > 0) setCategoryName(res.data[0].category.name);
      })
      .finally(() => setLoading(false));
  }, [categorySlug, page, sort]);

  const sortLabels: Record<SortType, string> = {
    newest: 'Najnowsze',
    active: 'Aktywne',
    popular: 'Popularne',
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{categoryName || categorySlug}</span>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2">
          {(['newest', 'active', 'popular'] as SortType[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1); }}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                sort === s ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>
        <Link
          to="/user/forum/nowy"
          className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + Nowy wątek
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Ładowanie...</div>
      ) : threads.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Brak wątków w tej kategorii.</div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => <ForumThreadCard key={t.id} thread={t} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">
            ← Poprzednia
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">
            Następna →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumCategory.tsx
git commit -m "feat(forum): richer thread cards with tags, hot indicator, last reply, view count"
```

---

## Task 9: ForumThread Redesign

**Files:**
- Modify: `apps/web/src/pages/user/forum/ForumThread.tsx`

- [ ] **Step 1: Rewrite ForumThread.tsx**

Replace the entire file with:
```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forumApi, ForumPost, ForumThread as ForumThreadType } from '@/api/forum.api';
import { useAuthStore } from '@/store/auth.store';
import { getRankLabel } from './ForumHome';

interface QuoteState {
  postId: string;
  content: string;
  authorName: string;
}

function ReactionButton({
  emoji, count, reacted, onClick,
}: { emoji: string; count: number; reacted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
        reacted ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'
      }`}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

function ForumPostItem({
  post,
  currentUserId,
  isAdmin,
  onDelete,
  onQuote,
  onReact,
}: {
  post: ForumPost;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onQuote: (state: QuoteState) => void;
  onReact: (postId: string, type: 'LIKE' | 'HEART' | 'HELPFUL') => void;
}) {
  const canDelete = isAdmin || post.author.id === currentUserId;
  const postCount = post.author._count?.forumPosts ?? 0;
  const rankLabel = getRankLabel(postCount);
  const canClickProfile = !post.isAnonymous && post.author.id;

  return (
    <div className={`bg-white rounded-xl border p-4 ${post.mentionsAdmin ? 'border-l-4 border-l-purple-400 border-gray-200' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {/* Author column */}
        <div className="shrink-0 w-24 text-center hidden sm:block">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium text-sm mx-auto mb-1">
            {post.author.name.charAt(0).toUpperCase()}
          </div>
          {canClickProfile ? (
            <Link to={`/user/forum/uzytkownik/${post.author.id}`} className="text-xs font-medium text-gray-800 hover:text-purple-600 leading-tight block">
              {post.author.name}
            </Link>
          ) : (
            <span className="text-xs font-medium text-gray-800 leading-tight">{post.author.name}</span>
          )}
          <span className="text-xs text-purple-600 font-medium block mt-0.5">{rankLabel}</span>
          <span className="text-xs text-gray-400 block">{postCount} postów</span>
          {post.author.createdAt && (
            <span className="text-xs text-gray-300 block">od {new Date(post.author.createdAt).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}</span>
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Mobile author row */}
          <div className="flex items-center gap-2 mb-2 sm:hidden">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium text-xs shrink-0">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800">{post.author.name}</span>
            <span className="text-xs text-purple-600">{rankLabel}</span>
          </div>

          {/* Quoted block */}
          {post.quotedContent && (
            <div className="border-l-4 border-gray-300 bg-gray-50 rounded-r-lg px-3 py-2 mb-3">
              <p className="text-xs text-gray-500 italic mb-1">Cytowany post:</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{post.quotedContent}</p>
            </div>
          )}

          <p className="text-gray-700 text-sm whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <ReactionButton emoji="👍" count={post.reactions.LIKE.count} reacted={post.reactions.LIKE.reacted} onClick={() => onReact(post.id, 'LIKE')} />
              <ReactionButton emoji="❤️" count={post.reactions.HEART.count} reacted={post.reactions.HEART.reacted} onClick={() => onReact(post.id, 'HEART')} />
              <ReactionButton emoji="💡" count={post.reactions.HELPFUL.count} reacted={post.reactions.HELPFUL.reacted} onClick={() => onReact(post.id, 'HELPFUL')} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('pl-PL')}</span>
              <button
                onClick={() => onQuote({ postId: post.id, content: post.content.slice(0, 300), authorName: post.author.name })}
                className="text-xs text-gray-400 hover:text-purple-600"
              >
                Cytuj
              </button>
              {canDelete && (
                <button onClick={() => onDelete(post.id)} className="text-xs text-red-400 hover:text-red-600">Usuń</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [thread, setThread] = useState<ForumThreadType | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    Promise.all([
      forumApi.getThread(id, { page, limit: 20 }),
      forumApi.getWatchStatus(id),
    ]).then(([threadRes, watchRes]) => {
      setThread(threadRes.thread);
      setPosts(threadRes.posts.data);
      setTotalPages(threadRes.posts.totalPages);
      setWatching(watchRes.watching);
    }).finally(() => setLoading(false));
  }, [id, page]);

  const handleToggleWatch = async () => {
    if (!id) return;
    const res = await forumApi.toggleWatch(id);
    setWatching(res.watching);
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Usunąć tę odpowiedź?')) return;
    if (isAdmin) await forumApi.adminDeletePost(postId);
    else await forumApi.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleDeleteThread = async () => {
    if (!thread) return;
    if (!window.confirm('Usunąć ten wątek?')) return;
    if (isAdmin) await forumApi.adminDeleteThread(thread.id);
    else await forumApi.deleteThread(thread.id);
    navigate('/user/forum');
  };

  const handleReact = async (postId: string, type: 'LIKE' | 'HEART' | 'HELPFUL') => {
    const result = await forumApi.reactToPost(postId, type);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [type]: { count: result.counts[type] ?? 0, reacted: result.reacted && result.type === type },
          },
        };
      })
    );
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyContent.trim()) return;
    setSubmitting(true);
    setReplyError('');
    try {
      const post = await forumApi.createPost(id, {
        content: replyContent,
        isAnonymous: replyAnon,
        quotedPostId: quoteState?.postId,
        quotedContent: quoteState?.content,
      });
      setPosts((prev) => [...prev, post]);
      setReplyContent('');
      setReplyAnon(false);
      setQuoteState(null);
    } catch {
      setReplyError('Nie udało się wysłać odpowiedzi. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;
  if (!thread) return <div className="p-6 text-center text-gray-400">Nie znaleziono wątku.</div>;

  const canDeleteThread = isAdmin || thread.author.id === user?.id;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-32">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <Link to={`/user/forum/${thread.category.slug}`} className="hover:text-purple-600">
          {thread.category.name}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex gap-2 flex-wrap">
            {thread.isPinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Przypięty</span>}
            {thread.isLocked && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Zamknięty</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleWatch}
              className={`text-sm px-3 py-1 rounded-lg border transition-colors ${watching ? 'bg-purple-50 border-purple-200 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-purple-200'}`}
            >
              {watching ? '🔔 Obserwujesz' : '🔕 Obserwuj'}
            </button>
            {canDeleteThread && (
              <button onClick={handleDeleteThread} className="text-xs text-red-400 hover:text-red-600 px-2 py-1">Usuń wątek</button>
            )}
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">{thread.title}</h1>

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {thread.tags.map((tag) => (
              <Link
                key={tag}
                to={`/user/forum/szukaj?tags=${encodeURIComponent(tag)}`}
                className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full hover:bg-purple-100 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">{thread.content}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{thread.author.name}</span>
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleDateString('pl-PL')}</span>
          <span>·</span>
          <span>👁 {thread.viewCount} wyświetleń</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {posts.map((post) => (
          <ForumPostItem
            key={post.id}
            post={post}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
            onDelete={handleDeletePost}
            onQuote={setQuoteState}
            onReact={handleReact}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mb-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">← Poprzednia</button>
          <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Następna →</button>
        </div>
      )}

      {!thread.isLocked && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border md:rounded-xl md:p-5">
          <form onSubmit={handleSubmitReply}>
            {quoteState && (
              <div className="flex items-start gap-2 mb-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Cytujesz: <span className="font-medium">{quoteState.authorName}</span></p>
                  <p className="text-xs text-gray-600 line-clamp-2">{quoteState.content}</p>
                </div>
                <button type="button" onClick={() => setQuoteState(null)} className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none">✕</button>
              </div>
            )}
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Napisz odpowiedź... (użyj @admin jeśli potrzebujesz pomocy)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={replyAnon} onChange={(e) => setReplyAnon(e.target.checked)} className="rounded" />
                Anonimowo
              </label>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors"
              >
                {submitting ? 'Wysyłanie...' : 'Odpowiedz'}
              </button>
            </div>
            {replyError && <p className="text-xs text-red-500 mt-1">{replyError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumThread.tsx
git commit -m "feat(forum): add reactions, quotes, user rank, view count to ForumThread"
```

---

## Task 10: ForumNewThread — Tags Field

**Files:**
- Modify: `apps/web/src/pages/user/forum/ForumNewThread.tsx`

- [ ] **Step 1: Add tag state and autocomplete logic**

Add to the imports:
```tsx
import { useEffect, useRef, useState } from 'react';
import { forumApi, ForumCategory, ForumTag } from '@/api/forum.api';
```

Add state inside the `ForumNewThread` component (after existing state):
```tsx
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [popularTags, setPopularTags] = useState<ForumTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
```

Fetch popular tags in the existing `useEffect`:
```tsx
    forumApi.getCategories().then(cats => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
    forumApi.getPopularTags().then(setPopularTags);
```

Add tag helper functions before the return:
```tsx
  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized || normalized.length > 30 || tags.includes(normalized) || tags.length >= 5) return;
    setTags(prev => [...prev, normalized]);
    setTagInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const filteredSuggestions = popularTags
    .filter(t => t.tag.includes(tagInput.toLowerCase()) && !tags.includes(t.tag))
    .slice(0, 5);
```

Update `handleSubmit` to pass `tags`:
```tsx
      const thread = await forumApi.createThread({ title, content, categoryId, isAnonymous, tags });
```

- [ ] **Step 2: Add tags field to the form JSX**

Add after the `content` textarea field and before the anonymous checkbox, inside the form:
```tsx
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tagi <span className="text-gray-400 font-normal">(opcjonalnie, maks. 5)</span>
          </label>
          {/* Current tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-purple-900 font-bold">✕</button>
                </span>
              ))}
            </div>
          )}
          {/* Tag input */}
          {tags.length < 5 && (
            <div className="relative">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowSuggestions(true); }}
                onKeyDown={handleTagKeyDown}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Wpisz tag i naciśnij Enter..."
                maxLength={30}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-sm mt-1">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s.tag}
                      type="button"
                      onMouseDown={() => addTag(s.tag)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex justify-between"
                    >
                      <span>#{s.tag}</span>
                      <span className="text-gray-400 text-xs">{s.count}x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Dodaj tagi, żeby inni łatwiej znaleźli Twój wątek</p>
        </div>
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumNewThread.tsx
git commit -m "feat(forum): add tag input with autocomplete to ForumNewThread"
```

---

## Task 11: ForumSearch — New Page

**Files:**
- Create: `apps/web/src/pages/user/forum/ForumSearch.tsx`

- [ ] **Step 1: Create ForumSearch.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { forumApi, ForumThread, ForumTag } from '@/api/forum.api';
import { getRelativeTime } from './ForumHome';

function highlight(text: string, q: string): React.ReactNode {
  if (!q || q.length < 2) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 rounded">{part}</mark>
      : part
  );
}

export function ForumSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';
  const activeTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
  const categoryId = searchParams.get('categoryId') ?? undefined;

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [popularTags, setPopularTags] = useState<ForumTag[]>([]);
  const [inputValue, setInputValue] = useState(q);

  useEffect(() => {
    forumApi.getPopularTags().then(setPopularTags);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setThreads([]); return; }
    setLoading(true);
    forumApi.search({ q, tags: activeTags.length > 0 ? activeTags : undefined, categoryId, page })
      .then(res => { setThreads(res.data); setTotalPages(res.totalPages); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [q, searchParams.toString(), page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', inputValue);
    newParams.delete('tags');
    setSearchParams(newParams);
    setPage(1);
  };

  const toggleTag = (tag: string) => {
    const current = searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    const newParams = new URLSearchParams(searchParams);
    if (next.length > 0) newParams.set('tags', next.join(','));
    else newParams.delete('tags');
    setSearchParams(newParams);
    setPage(1);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">Wyszukiwarka</span>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Szukaj na forum..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          Szukaj
        </button>
      </form>

      {/* Popular tags filter */}
      {popularTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {popularTags.slice(0, 12).map(t => (
            <button
              key={t.tag}
              onClick={() => toggleTag(t.tag)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeTags.includes(t.tag)
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300'
              }`}
            >
              #{t.tag}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading && <div className="text-center text-gray-500 py-8">Szukam...</div>}

      {!loading && q.length >= 2 && threads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">Nic nie znaleziono dla „{q}"</p>
          <Link to="/user/forum/nowy" className="text-purple-600 text-sm hover:underline">
            Może założysz nowy wątek?
          </Link>
        </div>
      )}

      {!loading && threads.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">Znaleziono {total} wyników</p>
          <div className="space-y-3">
            {threads.map(thread => (
              <Link
                key={thread.id}
                to={`/user/forum/watek/${thread.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-medium text-gray-800 mb-1">{highlight(thread.title, q)}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{highlight(thread.content.slice(0, 200), q)}</p>
                {thread.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {thread.tags.map(tag => (
                      <span key={tag} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{thread.category.name}</span>
                  <span>·</span>
                  <span>{thread.author.name}</span>
                  <span>·</span>
                  <span>{getRelativeTime(thread.createdAt)}</span>
                  <span>·</span>
                  <span>{thread._count?.posts ?? 0} odpowiedzi</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">← Poprzednia</button>
              <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Następna →</button>
            </div>
          )}
        </>
      )}

      {q.length < 2 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>Wpisz co najmniej 2 znaki, żeby wyszukać</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumSearch.tsx
git commit -m "feat(forum): add ForumSearch page with tag filters and highlight"
```

---

## Task 12: ForumUserProfile — New Page

**Files:**
- Create: `apps/web/src/pages/user/forum/ForumUserProfile.tsx`

- [ ] **Step 1: Create ForumUserProfile.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forumApi, ForumUserProfile as ForumUserProfileType } from '@/api/forum.api';
import { getRankLabel, getRelativeTime } from './ForumHome';

export function ForumUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<ForumUserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    forumApi.getUserThreads(userId)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="p-6 text-center text-gray-500">Ładowanie...</div>;
  if (notFound || !data) return <div className="p-6 text-center text-gray-400">Nie znaleziono użytkownika.</div>;

  const { user, postCount, data: threads } = data;
  const rankLabel = getRankLabel(postCount);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/user/forum" className="hover:text-purple-600">Forum</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">Profil użytkownika</span>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
          <span className="inline-block text-sm text-purple-600 font-medium mt-0.5">{rankLabel}</span>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>💬 {postCount} postów</span>
            <span>📅 dołączył/a {new Date(user.createdAt).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Threads */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Ostatnie wątki</h2>
      {threads.length === 0 ? (
        <p className="text-gray-400 text-sm">Brak publicznych wątków.</p>
      ) : (
        <div className="space-y-2">
          {threads.map(thread => (
            <Link
              key={thread.id}
              to={`/user/forum/watek/${thread.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-800 text-sm">{thread.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{thread.category.name}</span>
                <span>·</span>
                <span>{getRelativeTime(thread.createdAt)}</span>
                <span>·</span>
                <span>{thread._count?.posts ?? 0} odpowiedzi</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/forum/ForumUserProfile.tsx
git commit -m "feat(forum): add ForumUserProfile page with rank, stats, thread history"
```

---

## Task 13: Router Registration

**Files:**
- Modify: `apps/web/src/router.tsx`

- [ ] **Step 1: Add imports and routes for new pages**

Find the section in `router.tsx` where forum routes are defined (inside `UserLayout`). Add imports at the top of the file:
```tsx
import { ForumSearch } from '@/pages/user/forum/ForumSearch';
import { ForumUserProfile } from '@/pages/user/forum/ForumUserProfile';
```

Then add two new `<Route>` entries alongside the existing forum routes:
```tsx
<Route path="forum/szukaj" element={<ForumSearch />} />
<Route path="forum/uzytkownik/:userId" element={<ForumUserProfile />} />
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/router.tsx
git commit -m "feat(forum): register ForumSearch and ForumUserProfile routes"
```

---

## Task 14: Final Integration Check

- [ ] **Step 1: Start the dev server and verify no TypeScript errors**

```bash
cd cosmo-app
pnpm dev
```

Open browser to `http://localhost:5173/user/forum`. Check that:
- Forum home loads with categories
- Clicking a category shows thread list
- Thread view shows posts with reaction buttons
- "+ Nowy wątek" opens the new thread form with tags field
- Search bar navigates to search page

- [ ] **Step 2: Run backend tests**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/forum/forum.service.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Build check**

```bash
cd cosmo-app
pnpm build
```

Expected: No TypeScript compilation errors.

- [ ] **Step 4: Deploy**

```bash
cd cosmo-app
./deploy.sh
```

- [ ] **Step 5: Final commit if any fixups needed**

```bash
cd cosmo-app
git add -A
git commit -m "fix(forum): integration fixups after full build check"
```
