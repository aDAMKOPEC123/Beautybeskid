# Marketing Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodanie zakladki "Marketing" w panelu admina z kalendarzem contentu (FullCalendar) i bankiem pomyslow na rolki, z danymi w PostgreSQL.

**Architecture:** Nowy modul backendowy `marketing` (service/controller/router) z dwoma modelami Prisma (`ContentPost`, `RolkaIdea`). Frontend: jedna trasa `/admin/marketing` z poziomymi tabami wewnatrz strony (useState), FullCalendar z drag & drop dla kalendarza, tabela z filtrowaniem po stronie klienta dla banku pomyslow.

**Tech Stack:** Node.js/Express 5 + Prisma + PostgreSQL (backend), React 19 + TypeScript + FullCalendar v6 + @tanstack/react-query (frontend), vitest (testy backendowe)

**Spec:** `docs/superpowers/specs/2026-06-11-marketing-tab-design.md`

---

## Mapa plikow

**Nowe pliki (backend):**
- `apps/server/src/modules/marketing/marketing.service.ts` - logika biznesowa CRUD
- `apps/server/src/modules/marketing/marketing.service.test.ts` - testy jednostkowe
- `apps/server/src/modules/marketing/marketing.controller.ts` - handlery HTTP
- `apps/server/src/modules/marketing/marketing.router.ts` - definicja tras

**Modyfikowane pliki (backend):**
- `apps/server/prisma/schema.prisma` - dodanie modeli ContentPost, RolkaIdea i enumow
- `apps/server/src/app.ts` - rejestracja marketingRouter

**Nowe pliki (frontend):**
- `apps/web/src/types/marketing.types.ts` - typy TypeScript lokalne
- `apps/web/src/api/marketing.api.ts` - wywolania API
- `apps/web/src/components/marketing/MarketingTabs.tsx` - poziome taby z mobile-scroll
- `apps/web/src/components/marketing/ContentEventCard.tsx` - renderer kart w FullCalendar
- `apps/web/src/components/marketing/ContentPostModal.tsx` - modal dodaj/edytuj post
- `apps/web/src/components/marketing/RolkaIdeaModal.tsx` - modal dodaj/edytuj pomysl
- `apps/web/src/pages/admin/marketing/MarketingKalendar.tsx` - widok kalendarza
- `apps/web/src/pages/admin/marketing/MarketingRolki.tsx` - tabela pomyslow
- `apps/web/src/pages/admin/Marketing.tsx` - kontener z tabami

**Modyfikowane pliki (frontend):**
- `apps/web/src/router.tsx` - dodanie trasy /admin/marketing
- `apps/web/src/components/layout/AdminLayout.tsx` - dodanie sekcji Marketing w sidebarze

---

### Task 1: Schema Prisma - nowe modele i enums

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Dodaj enums i modele na koniec schema.prisma**

Otwórz `apps/server/prisma/schema.prisma` i dodaj na końcu pliku:

```prisma
enum SocialPlatform {
  IG
  TIKTOK
  FB
}

enum ContentFormat {
  ROLKA
  KARUZELA
  STORY
  POST
}

enum ContentStatus {
  POMYSL
  SCENARIUSZ
  NAGRANE
  ZMONTOWANE
  OPUBLIKOWANE
}

enum IdeaCategory {
  LAMINACJA
  PEDICURE
  PODOLOGIA
  TWARZ
  BRWI
  INNE
}

enum IdeaType {
  POV
  COMEDY
  EDUKACYJNA
  BEFORE_AFTER
  BLIND_REACTION
  LOOP
}

enum IdeaStatus {
  POMYSL
  SCENARIUSZ
  GOTOWA
  WYKORZYSTANA
}

model ContentPost {
  id           String         @id @default(cuid())
  title        String
  platform     SocialPlatform
  format       ContentFormat
  scheduledAt  DateTime
  status       ContentStatus
  thumbnailUrl String?
  notes        String?
  ideaId       String?        @unique
  idea         RolkaIdea?     @relation(fields: [ideaId], references: [id])
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model RolkaIdea {
  id          String       @id @default(cuid())
  title       String
  hook        String?
  sceneDesc   String?
  category    IdeaCategory
  type        IdeaType
  audioName   String?
  audioUrl    String?
  props       String?
  status      IdeaStatus
  plannedDate DateTime?
  post        ContentPost?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

- [ ] **Step 2: Uruchom migracje**

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate
# Kiedy pyta o nazwe migracji: marketing
pnpm prisma:generate
```

Oczekiwany wynik: `Your database is now in sync with your schema.`

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add ContentPost and RolkaIdea prisma models"
```

---

### Task 2: Backend service z testami

**Files:**
- Create: `apps/server/src/modules/marketing/marketing.service.ts`
- Create: `apps/server/src/modules/marketing/marketing.service.test.ts`

- [ ] **Step 1: Napisz failujace testy**

Utwórz `apps/server/src/modules/marketing/marketing.service.test.ts`:

```typescript
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
```

- [ ] **Step 2: Uruchom testy - sprawdz ze failuja**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/marketing/marketing.service.test.ts
```

Oczekiwany wynik: blad `Cannot find module './marketing.service'`

- [ ] **Step 3: Napisz marketing.service.ts**

Utwórz `apps/server/src/modules/marketing/marketing.service.ts`:

```typescript
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import {
  SocialPlatform,
  ContentFormat,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
} from '@prisma/client';

export interface CreatePostDto {
  title: string;
  platform: SocialPlatform;
  format: ContentFormat;
  scheduledAt: string;
  status: ContentStatus;
  thumbnailUrl?: string;
  notes?: string;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface PostFilters {
  platform?: SocialPlatform;
  status?: ContentStatus;
  from?: string;
  to?: string;
}

export interface CreateIdeaDto {
  title: string;
  hook?: string;
  sceneDesc?: string;
  category: IdeaCategory;
  type: IdeaType;
  audioName?: string;
  audioUrl?: string;
  props?: string;
  status: IdeaStatus;
  plannedDate?: string;
}

export interface UpdateIdeaDto extends Partial<CreateIdeaDto> {}

export interface IdeaFilters {
  category?: IdeaCategory;
  type?: IdeaType;
  status?: IdeaStatus;
}

export const getPosts = async (filters: PostFilters) => {
  const where: any = {};
  if (filters.platform) where.platform = filters.platform;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.scheduledAt = {};
    if (filters.from) where.scheduledAt.gte = new Date(filters.from);
    if (filters.to) where.scheduledAt.lte = new Date(filters.to);
  }
  return prisma.contentPost.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: { idea: { select: { title: true, category: true } } },
  });
};

export const createPost = async (data: CreatePostDto) => {
  return prisma.contentPost.create({
    data: {
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    },
  });
};

export const updatePost = async (id: string, data: UpdatePostDto) => {
  const exists = await prisma.contentPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Publikacja nie znaleziona', 404);
  return prisma.contentPost.update({
    where: { id },
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
  });
};

export const deletePost = async (id: string) => {
  const exists = await prisma.contentPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Publikacja nie znaleziona', 404);
  return prisma.contentPost.delete({ where: { id } });
};

export const getIdeas = async (filters: IdeaFilters) => {
  const where: any = {};
  if (filters.category) where.category = filters.category;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  return prisma.rolkaIdea.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { post: { select: { id: true, scheduledAt: true, status: true } } },
  });
};

export const createIdea = async (data: CreateIdeaDto) => {
  return prisma.rolkaIdea.create({
    data: {
      ...data,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
    },
  });
};

export const updateIdea = async (id: string, data: UpdateIdeaDto) => {
  const exists = await prisma.rolkaIdea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Pomysl nie znaleziony', 404);
  return prisma.rolkaIdea.update({
    where: { id },
    data: {
      ...data,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
    },
  });
};

export const deleteIdea = async (id: string) => {
  const exists = await prisma.rolkaIdea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Pomysl nie znaleziony', 404);
  return prisma.rolkaIdea.delete({ where: { id } });
};

export const scheduleIdea = async (ideaId: string, data: CreatePostDto) => {
  const existing = await prisma.contentPost.findUnique({ where: { ideaId } });
  if (existing) throw new AppError('Pomysl jest juz zaplanowany', 409);
  return prisma.contentPost.create({
    data: {
      ...data,
      scheduledAt: new Date(data.scheduledAt),
      ideaId,
    },
  });
};

export const duplicateIdea = async (id: string) => {
  const idea = await prisma.rolkaIdea.findUnique({ where: { id } });
  if (!idea) throw new AppError('Pomysl nie znaleziony', 404);
  const { id: _id, createdAt: _c, updatedAt: _u, post: _p, plannedDate: _pd, ...rest } = idea as any;
  return prisma.rolkaIdea.create({
    data: {
      ...rest,
      status: 'POMYSL',
      plannedDate: undefined,
    },
  });
};
```

- [ ] **Step 4: Uruchom testy - sprawdz ze przechodza**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/marketing/marketing.service.test.ts
```

Oczekiwany wynik: wszystkie testy PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/marketing/
git commit -m "feat: add marketing service with tests"
```

---

### Task 3: Backend controller i router

**Files:**
- Create: `apps/server/src/modules/marketing/marketing.controller.ts`
- Create: `apps/server/src/modules/marketing/marketing.router.ts`

- [ ] **Step 1: Utwórz marketing.controller.ts**

```typescript
// apps/server/src/modules/marketing/marketing.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from './marketing.service';
import {
  SocialPlatform,
  ContentFormat,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
} from '@prisma/client';

export const listPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, status, from, to } = req.query as Record<string, string>;
    const posts = await service.getPosts({
      platform: platform as SocialPlatform | undefined,
      status: status as ContentStatus | undefined,
      from,
      to,
    });
    res.json(posts);
  } catch (e) { next(e); }
};

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await service.createPost(req.body);
    res.status(201).json(post);
  } catch (e) { next(e); }
};

export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await service.updatePost(req.params.id, req.body);
    res.json(post);
  } catch (e) { next(e); }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deletePost(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

export const listIdeas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, type, status } = req.query as Record<string, string>;
    const ideas = await service.getIdeas({
      category: category as IdeaCategory | undefined,
      type: type as IdeaType | undefined,
      status: status as IdeaStatus | undefined,
    });
    res.json(ideas);
  } catch (e) { next(e); }
};

export const createIdea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idea = await service.createIdea(req.body);
    res.status(201).json(idea);
  } catch (e) { next(e); }
};

export const updateIdea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idea = await service.updateIdea(req.params.id, req.body);
    res.json(idea);
  } catch (e) { next(e); }
};

export const deleteIdea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteIdea(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

export const scheduleIdea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await service.scheduleIdea(req.params.id, req.body);
    res.status(201).json(post);
  } catch (e) { next(e); }
};

export const duplicateIdea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idea = await service.duplicateIdea(req.params.id);
    res.status(201).json(idea);
  } catch (e) { next(e); }
};
```

- [ ] **Step 2: Utwórz marketing.router.ts**

```typescript
// apps/server/src/modules/marketing/marketing.router.ts
import { Router } from 'express';
import * as ctrl from './marketing.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/posts', ctrl.listPosts);
router.post('/posts', ctrl.createPost);
router.patch('/posts/:id', ctrl.updatePost);
router.delete('/posts/:id', ctrl.deletePost);

router.get('/ideas', ctrl.listIdeas);
router.post('/ideas', ctrl.createIdea);
router.patch('/ideas/:id', ctrl.updateIdea);
router.delete('/ideas/:id', ctrl.deleteIdea);
router.post('/ideas/:id/schedule', ctrl.scheduleIdea);
router.post('/ideas/:id/duplicate', ctrl.duplicateIdea);

export default router;
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/marketing/
git commit -m "feat: add marketing controller and router"
```

---

### Task 4: Rejestracja modulu w app.ts

**Files:**
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Dodaj import i rejestracje trasy**

W `apps/server/src/app.ts` dodaj import razem z pozostalymi:

```typescript
import marketingRouter from './modules/marketing/marketing.router';
```

Nastepnie dodaj wpis `app.use` razem z pozostalymi trasami (po `academyRouter`):

```typescript
app.use('/api/marketing', marketingRouter);
```

- [ ] **Step 2: Sprawdz ze serwer sie uruchamia**

```bash
cd cosmo-app/apps/server
pnpm dev
```

Oczekiwany wynik: serwer startuje bez bledow TypeScript

- [ ] **Step 3: Zweryfikuj endpointy recznym requestem**

```bash
# W osobnym terminalu (serwer musi byc uruchomiony i zalogowany jako admin)
curl -X GET http://localhost:3001/api/marketing/posts \
  -H "Authorization: Bearer <TWOJ_TOKEN_ADMINA>"
```

Oczekiwany wynik: `[]` (pusta tablica)

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "feat: register marketing router in app.ts"
```

---

### Task 5: Typy frontendowe i API

**Files:**
- Create: `apps/web/src/types/marketing.types.ts`
- Create: `apps/web/src/api/marketing.api.ts`

- [ ] **Step 1: Utwórz typy**

```typescript
// apps/web/src/types/marketing.types.ts

export type SocialPlatform = 'IG' | 'TIKTOK' | 'FB';
export type ContentFormat = 'ROLKA' | 'KARUZELA' | 'STORY' | 'POST';
export type ContentStatus = 'POMYSL' | 'SCENARIUSZ' | 'NAGRANE' | 'ZMONTOWANE' | 'OPUBLIKOWANE';
export type IdeaCategory = 'LAMINACJA' | 'PEDICURE' | 'PODOLOGIA' | 'TWARZ' | 'BRWI' | 'INNE';
export type IdeaType = 'POV' | 'COMEDY' | 'EDUKACYJNA' | 'BEFORE_AFTER' | 'BLIND_REACTION' | 'LOOP';
export type IdeaStatus = 'POMYSL' | 'SCENARIUSZ' | 'GOTOWA' | 'WYKORZYSTANA';

export interface ContentPost {
  id: string;
  title: string;
  platform: SocialPlatform;
  format: ContentFormat;
  scheduledAt: string;
  status: ContentStatus;
  thumbnailUrl?: string | null;
  notes?: string | null;
  ideaId?: string | null;
  idea?: { title: string; category: IdeaCategory } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolkaIdea {
  id: string;
  title: string;
  hook?: string | null;
  sceneDesc?: string | null;
  category: IdeaCategory;
  type: IdeaType;
  audioName?: string | null;
  audioUrl?: string | null;
  props?: string | null;
  status: IdeaStatus;
  plannedDate?: string | null;
  post?: { id: string; scheduledAt: string; status: ContentStatus } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  title: string;
  platform: SocialPlatform;
  format: ContentFormat;
  scheduledAt: string;
  status: ContentStatus;
  thumbnailUrl?: string;
  notes?: string;
}

export interface CreateIdeaDto {
  title: string;
  hook?: string;
  sceneDesc?: string;
  category: IdeaCategory;
  type: IdeaType;
  audioName?: string;
  audioUrl?: string;
  props?: string;
  status: IdeaStatus;
  plannedDate?: string;
}

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  IG: '#E1306C',
  TIKTOK: '#010101',
  FB: '#4267B2',
};

export const STATUS_COLORS: Record<ContentStatus, string> = {
  POMYSL: '#94a3b8',
  SCENARIUSZ: '#f59e0b',
  NAGRANE: '#3b82f6',
  ZMONTOWANE: '#8b5cf6',
  OPUBLIKOWANE: '#10b981',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  POMYSL: 'Pomysl',
  SCENARIUSZ: 'Scenariusz',
  NAGRANE: 'Nagrane',
  ZMONTOWANE: 'Zmontowane',
  OPUBLIKOWANE: 'Opublikowane',
};

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  POMYSL: 'Pomysl',
  SCENARIUSZ: 'Scenariusz',
  GOTOWA: 'Gotowa',
  WYKORZYSTANA: 'Wykorzystana',
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  IG: 'Instagram',
  TIKTOK: 'TikTok',
  FB: 'Facebook',
};

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  ROLKA: 'Rolka',
  KARUZELA: 'Karuzela',
  STORY: 'Story',
  POST: 'Post',
};

export const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  LAMINACJA: 'Laminacja',
  PEDICURE: 'Pedicure',
  PODOLOGIA: 'Podologia',
  TWARZ: 'Twarz',
  BRWI: 'Brwi',
  INNE: 'Inne',
};

export const TYPE_LABELS: Record<IdeaType, string> = {
  POV: 'POV',
  COMEDY: 'Comedy',
  EDUKACYJNA: 'Edukacyjna',
  BEFORE_AFTER: 'Before/After',
  BLIND_REACTION: 'Blind Reaction',
  LOOP: 'Loop',
};
```

- [ ] **Step 2: Utwórz API module**

```typescript
// apps/web/src/api/marketing.api.ts
import api from '@/lib/axios';
import type {
  ContentPost,
  RolkaIdea,
  CreatePostDto,
  CreateIdeaDto,
  SocialPlatform,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
} from '@/types/marketing.types';

export interface PostFilters {
  platform?: SocialPlatform;
  status?: ContentStatus;
  from?: string;
  to?: string;
}

export interface IdeaFilters {
  category?: IdeaCategory;
  type?: IdeaType;
  status?: IdeaStatus;
}

export const marketingApi = {
  getPosts: async (filters: PostFilters = {}): Promise<ContentPost[]> => {
    const res = await api.get('/marketing/posts', { params: filters });
    return res.data;
  },
  createPost: async (data: CreatePostDto): Promise<ContentPost> => {
    const res = await api.post('/marketing/posts', data);
    return res.data;
  },
  updatePost: async (id: string, data: Partial<CreatePostDto>): Promise<ContentPost> => {
    const res = await api.patch(`/marketing/posts/${id}`, data);
    return res.data;
  },
  deletePost: async (id: string): Promise<void> => {
    await api.delete(`/marketing/posts/${id}`);
  },
  getIdeas: async (filters: IdeaFilters = {}): Promise<RolkaIdea[]> => {
    const res = await api.get('/marketing/ideas', { params: filters });
    return res.data;
  },
  createIdea: async (data: CreateIdeaDto): Promise<RolkaIdea> => {
    const res = await api.post('/marketing/ideas', data);
    return res.data;
  },
  updateIdea: async (id: string, data: Partial<CreateIdeaDto>): Promise<RolkaIdea> => {
    const res = await api.patch(`/marketing/ideas/${id}`, data);
    return res.data;
  },
  deleteIdea: async (id: string): Promise<void> => {
    await api.delete(`/marketing/ideas/${id}`);
  },
  scheduleIdea: async (ideaId: string, data: CreatePostDto): Promise<ContentPost> => {
    const res = await api.post(`/marketing/ideas/${ideaId}/schedule`, data);
    return res.data;
  },
  duplicateIdea: async (ideaId: string): Promise<RolkaIdea> => {
    const res = await api.post(`/marketing/ideas/${ideaId}/duplicate`);
    return res.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/marketing.types.ts apps/web/src/api/marketing.api.ts
git commit -m "feat: add marketing frontend types and API module"
```

---

### Task 6: Router + AdminLayout

**Files:**
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Dodaj trase w router.tsx**

W `apps/web/src/router.tsx` dodaj import:

```typescript
import { Marketing } from '@/pages/admin/Marketing';
```

W tablicy `children` sekcji `/admin` dodaj nowy wpis (po ostatnim wpisie):

```typescript
{ path: 'marketing', element: <Marketing /> },
```

- [ ] **Step 2: Dodaj sekcje Marketing w AdminLayout.tsx**

W `apps/web/src/components/layout/AdminLayout.tsx`:

**a)** Dodaj nowy stan po `ustawieniaOpen`:

```typescript
const [marketingOpen, setMarketingOpen] = useState(
  () => location.pathname.startsWith('/admin/marketing')
);
```

**b)** Dodaj sekcje w nawigacji desktopowej (po sekcji "Ustawienia", przed zamknieciem `</nav>`):

```tsx
{/* Marketing */}
<div>
  <button
    onClick={() => setMarketingOpen(o => !o)}
    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md"
  >
    <span>Marketing</span>
    <ChevronDown size={14} className={marketingOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </button>
  {marketingOpen && (
    <div className="ml-3 mt-1 flex flex-col gap-1 border-l pl-3">
      <Link to="/admin/marketing" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        Planowanie contentu
      </Link>
    </div>
  )}
</div>
```

**c)** W mobilnej nawigacji poziomej (tablica z linkami) dodaj:

```typescript
{ to: '/admin/marketing', label: 'Marketing' },
```

- [ ] **Step 3: Sprawdz ze TypeScript sie kompiluje**

```bash
cd cosmo-app/apps/web
pnpm build 2>&1 | head -30
```

Oczekiwany wynik: blad "Cannot find module '@/pages/admin/Marketing'" - to OK, stworzymy plik w nastepnym kroku.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/router.tsx apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat: add Marketing route and sidebar entry"
```

---

### Task 7: Komponenty MarketingTabs i ContentEventCard

**Files:**
- Create: `apps/web/src/components/marketing/MarketingTabs.tsx`
- Create: `apps/web/src/components/marketing/ContentEventCard.tsx`

- [ ] **Step 1: Utwórz MarketingTabs.tsx**

```tsx
// apps/web/src/components/marketing/MarketingTabs.tsx
interface Tab {
  id: string;
  label: string;
  available: boolean;
}

const TABS: Tab[] = [
  { id: 'kalendarz', label: 'Kalendarz', available: true },
  { id: 'rolki', label: 'Rolki', available: true },
  { id: 'karuzele', label: 'Karuzele', available: false },
  { id: 'trendy', label: 'Trendy', available: false },
  { id: 'opisy', label: 'Opisy', available: false },
  { id: 'nagrania', label: 'Lista nagran', available: false },
  { id: 'kampanie', label: 'Kampanie', available: false },
  { id: 'wyniki', label: 'Wyniki', available: false },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export const MarketingTabs = ({ active, onChange }: Props) => (
  <nav
    className="overflow-x-auto flex gap-1 border-b pb-0 mb-6"
    style={{ scrollbarWidth: 'none' }}
  >
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => tab.available && onChange(tab.id)}
        disabled={!tab.available}
        className={[
          'shrink-0 px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap',
          active === tab.id
            ? 'border-primary text-primary bg-primary/5'
            : tab.available
            ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            : 'border-transparent text-muted-foreground/40 cursor-not-allowed',
        ].join(' ')}
      >
        {tab.label}
        {!tab.available && (
          <span className="ml-1.5 text-[10px] text-muted-foreground/50">wkrotce</span>
        )}
      </button>
    ))}
  </nav>
);
```

- [ ] **Step 2: Utwórz ContentEventCard.tsx**

```tsx
// apps/web/src/components/marketing/ContentEventCard.tsx
import type { EventContentArg } from '@fullcalendar/core';
import { PLATFORM_COLORS, STATUS_COLORS, FORMAT_LABELS, STATUS_LABELS } from '@/types/marketing.types';
import type { ContentPost } from '@/types/marketing.types';

interface Props {
  eventArg: EventContentArg;
}

export const ContentEventCard = ({ eventArg }: Props) => {
  const post = eventArg.event.extendedProps as ContentPost;
  const bgColor = PLATFORM_COLORS[post.platform] ?? '#6b7280';
  const statusColor = STATUS_COLORS[post.status] ?? '#94a3b8';
  const timeStr = eventArg.event.start
    ? new Date(eventArg.event.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderLeft: `4px solid ${statusColor}`,
      }}
      className="rounded-md px-2 py-1 h-full overflow-hidden cursor-pointer"
    >
      <div className="font-semibold text-white text-[11px] leading-tight truncate">
        {eventArg.event.title}
      </div>
      <div className="text-white/80 text-[10px] mt-0.5">
        {post.platform} {post.format ? FORMAT_LABELS[post.format] : ''} {timeStr && `• ${timeStr}`}
      </div>
      <span
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        className="inline-block text-white text-[9px] px-1 py-0.5 rounded mt-1"
      >
        {STATUS_LABELS[post.status]}
      </span>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/marketing/
git commit -m "feat: add MarketingTabs and ContentEventCard components"
```

---

### Task 8: ContentPostModal

**Files:**
- Create: `apps/web/src/components/marketing/ContentPostModal.tsx`

- [ ] **Step 1: Utwórz ContentPostModal.tsx**

```tsx
// apps/web/src/components/marketing/ContentPostModal.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { ContentPost, CreatePostDto } from '@/types/marketing.types';
import {
  PLATFORM_LABELS,
  FORMAT_LABELS,
  STATUS_LABELS,
} from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  post?: ContentPost | null;
  defaultValues?: Partial<CreatePostDto>;
  ideaId?: string;
}

export const ContentPostModal = ({ open, onClose, post, defaultValues, ideaId }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePostDto>();

  useEffect(() => {
    if (open) {
      reset(post ? {
        title: post.title,
        platform: post.platform,
        format: post.format,
        scheduledAt: post.scheduledAt.slice(0, 16),
        status: post.status,
        notes: post.notes ?? '',
      } : {
        status: 'POMYSL',
        format: 'ROLKA',
        platform: 'IG',
        scheduledAt: new Date().toISOString().slice(0, 16),
        ...defaultValues,
      });
    }
  }, [open, post, defaultValues, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      if (ideaId && !post) {
        return marketingApi.scheduleIdea(ideaId, data);
      }
      if (post) return marketingApi.updatePost(post.id, data);
      return marketingApi.createPost(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] });
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success(post ? 'Zapisano zmiany' : 'Dodano publikacje');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Blad zapisu');
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {post ? 'Edytuj publikacje' : 'Nowa publikacja'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Before/after laminacja"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Platforma *</label>
                <select {...register('platform', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>).map(p => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Format *</label>
                <select {...register('format', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(FORMAT_LABELS) as Array<keyof typeof FORMAT_LABELS>).map(f => (
                    <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data i godzina publikacji *</label>
              <input
                type="datetime-local"
                {...register('scheduledAt', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notatki</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Dodatkowe uwagi..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border rounded-md py-2 text-sm hover:bg-accent transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Zapisuję...' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/marketing/ContentPostModal.tsx
git commit -m "feat: add ContentPostModal component"
```

---

### Task 9: MarketingKalendar - strona kalendarza

**Files:**
- Create: `apps/web/src/pages/admin/marketing/MarketingKalendar.tsx`

- [ ] **Step 1: Utwórz MarketingKalendar.tsx**

```tsx
// apps/web/src/pages/admin/marketing/MarketingKalendar.tsx
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { EventDropArg } from '@fullcalendar/interaction';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { ContentEventCard } from '@/components/marketing/ContentEventCard';
import { ContentPostModal } from '@/components/marketing/ContentPostModal';
import type { ContentPost, SocialPlatform, ContentStatus } from '@/types/marketing.types';
import { PLATFORM_LABELS, STATUS_LABELS } from '@/types/marketing.types';

export const MarketingKalendar = () => {
  const qc = useQueryClient();
  const isMobile = window.innerWidth < 768;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | ''>('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | ''>('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['marketing', 'posts'],
    queryFn: () => marketingApi.getPosts({}),
  });

  const filteredPosts = posts.filter(p => {
    if (filterPlatform && p.platform !== filterPlatform) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const events = filteredPosts.map(p => ({
    id: p.id,
    title: p.title,
    start: p.scheduledAt,
    extendedProps: p,
  }));

  const handleDrop = async (info: EventDropArg) => {
    try {
      await marketingApi.updatePost(info.event.id, {
        scheduledAt: info.event.start!.toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] });
    } catch {
      info.revert();
      toast.error('Nie udalo sie przeniesc publikacji');
    }
  };

  const handleEventClick = (info: any) => {
    const post = info.event.extendedProps as ContentPost;
    setEditingPost(post);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Kalendarz contentu</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value as SocialPlatform | '')}
            className="border rounded-md px-2 py-1.5 text-sm bg-background"
          >
            <option value="">Wszystkie platformy</option>
            {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(p => (
              <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ContentStatus | '')}
            className="border rounded-md px-2 py-1.5 text-sm bg-background"
          >
            <option value="">Wszystkie statusy</option>
            {(Object.keys(STATUS_LABELS) as ContentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingPost(null); setModalOpen(true); }}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Dodaj
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Ladowanie...</div>
      ) : (
        <div className="bg-card rounded-xl border p-2 overflow-hidden">
          <FullCalendar
            plugins={[timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
            editable={true}
            locale="pl"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: isMobile ? 'listWeek,timeGridWeek' : 'timeGridWeek,listWeek',
            }}
            buttonText={{
              today: 'Dzis',
              week: 'Tydzien',
              list: 'Lista',
            }}
            events={events}
            eventContent={(arg) => <ContentEventCard eventArg={arg} />}
            eventDrop={handleDrop}
            eventClick={handleEventClick}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
          />
        </div>
      )}

      <ContentPostModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPost(null); }}
        post={editingPost}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/admin/marketing/
git commit -m "feat: add MarketingKalendar page"
```

---

### Task 10: RolkaIdeaModal

**Files:**
- Create: `apps/web/src/components/marketing/RolkaIdeaModal.tsx`

- [ ] **Step 1: Utwórz RolkaIdeaModal.tsx**

```tsx
// apps/web/src/components/marketing/RolkaIdeaModal.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import type { RolkaIdea, CreateIdeaDto } from '@/types/marketing.types';
import {
  CATEGORY_LABELS,
  TYPE_LABELS,
  IDEA_STATUS_LABELS,
} from '@/types/marketing.types';

interface Props {
  open: boolean;
  onClose: () => void;
  idea?: RolkaIdea | null;
}

export const RolkaIdeaModal = ({ open, onClose, idea }: Props) => {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateIdeaDto>();

  useEffect(() => {
    if (open) {
      reset(idea ? {
        title: idea.title,
        hook: idea.hook ?? '',
        sceneDesc: idea.sceneDesc ?? '',
        category: idea.category,
        type: idea.type,
        audioName: idea.audioName ?? '',
        audioUrl: idea.audioUrl ?? '',
        props: idea.props ?? '',
        status: idea.status,
        plannedDate: idea.plannedDate ? idea.plannedDate.slice(0, 10) : '',
      } : {
        category: 'LAMINACJA',
        type: 'BEFORE_AFTER',
        status: 'POMYSL',
      });
    }
  }, [open, idea, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: CreateIdeaDto) =>
      idea ? marketingApi.updateIdea(idea.id, data) : marketingApi.createIdea(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success(idea ? 'Zapisano zmiany' : 'Dodano pomysl');
      onClose();
    },
    onError: () => toast.error('Blad zapisu'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {idea ? 'Edytuj pomysl' : 'Nowy pomysl na rolke'}
          </h2>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tytul *</label>
              <input
                {...register('title', { required: 'Wymagane' })}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Before/after laminacja brwi"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hook (pierwsze 3 sekundy)</label>
              <input
                {...register('hook')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Nie uwierzysz w ten efekt..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Opis sceny</label>
              <textarea
                {...register('sceneDesc')}
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                placeholder="Co sie dzieje w filmiku..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Kategoria *</label>
                <select {...register('category', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Typ *</label>
                <select {...register('type', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Dzwiek / trend</label>
                <input
                  {...register('audioName')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="Nazwa dzwieku"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link do audio</label>
                <input
                  {...register('audioUrl')}
                  type="url"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rekwizyty</label>
              <input
                {...register('props')}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                placeholder="np. Dobre oswietlenie, biale tlo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select {...register('status', { required: true })} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {(Object.keys(IDEA_STATUS_LABELS) as Array<keyof typeof IDEA_STATUS_LABELS>).map(s => (
                    <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Planowana data</label>
                <input
                  type="date"
                  {...register('plannedDate')}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border rounded-md py-2 text-sm hover:bg-accent transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Zapisuję...' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/marketing/RolkaIdeaModal.tsx
git commit -m "feat: add RolkaIdeaModal component"
```

---

### Task 11: MarketingRolki - tabela banku pomyslow

**Files:**
- Create: `apps/web/src/pages/admin/marketing/MarketingRolki.tsx`

- [ ] **Step 1: Utwórz MarketingRolki.tsx**

```tsx
// apps/web/src/pages/admin/marketing/MarketingRolki.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { marketingApi } from '@/api/marketing.api';
import { RolkaIdeaModal } from '@/components/marketing/RolkaIdeaModal';
import { ContentPostModal } from '@/components/marketing/ContentPostModal';
import type { RolkaIdea, IdeaCategory, IdeaType, IdeaStatus } from '@/types/marketing.types';
import {
  CATEGORY_LABELS,
  TYPE_LABELS,
  IDEA_STATUS_LABELS,
  FORMAT_LABELS,
} from '@/types/marketing.types';

export const MarketingRolki = () => {
  const qc = useQueryClient();
  const [editingIdea, setEditingIdea] = useState<RolkaIdea | null>(null);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [schedulingIdea, setSchedulingIdea] = useState<RolkaIdea | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<IdeaCategory | ''>('');
  const [filterType, setFilterType] = useState<IdeaType | ''>('');
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | ''>('');

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['marketing', 'ideas'],
    queryFn: () => marketingApi.getIdeas({}),
  });

  const filtered = useMemo(() => ideas.filter(i => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterType && i.type !== filterType) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    return true;
  }), [ideas, filterCategory, filterType, filterStatus]);

  const deleteMutation = useMutation({
    mutationFn: marketingApi.deleteIdea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success('Pomysl usuniety');
    },
    onError: () => toast.error('Blad usuwania'),
  });

  const duplicateMutation = useMutation({
    mutationFn: marketingApi.duplicateIdea,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing', 'ideas'] });
      toast.success('Pomysl zduplikowany');
    },
    onError: () => toast.error('Blad duplikowania'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Na pewno usunac ten pomysl?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Bank pomyslow na rolki</h2>
        <button
          onClick={() => { setEditingIdea(null); setIdeaModalOpen(true); }}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Nowy pomysl
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as IdeaCategory | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie kategorie</option>
          {(Object.keys(CATEGORY_LABELS) as IdeaCategory[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as IdeaType | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie typy</option>
          {(Object.keys(TYPE_LABELS) as IdeaType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as IdeaStatus | '')}
          className="border rounded-md px-2 py-1.5 text-sm bg-background"
        >
          <option value="">Wszystkie statusy</option>
          {(Object.keys(IDEA_STATUS_LABELS) as IdeaStatus[]).map(s => (
            <option key={s} value={s}>{IDEA_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Ladowanie...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          Brak pomyslow. Dodaj pierwszy!
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tytul</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Hook</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Typ</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Zaplanowana</th>
                <th className="px-4 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((idea) => (
                <tr key={idea.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{idea.title}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {idea.hook ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {CATEGORY_LABELS[idea.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {TYPE_LABELS[idea.type]}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                      {IDEA_STATUS_LABELS[idea.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {idea.plannedDate
                      ? new Date(idea.plannedDate).toLocaleDateString('pl-PL')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {!idea.post && (
                        <button
                          onClick={() => { setSchedulingIdea(idea); setScheduleModalOpen(true); }}
                          className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Zaplanuj
                        </button>
                      )}
                      {idea.post && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Zaplanowana
                        </span>
                      )}
                      <button
                        onClick={() => duplicateMutation.mutate(idea.id)}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Duplikuj
                      </button>
                      <button
                        onClick={() => { setEditingIdea(idea); setIdeaModalOpen(true); }}
                        className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        Usun
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RolkaIdeaModal
        open={ideaModalOpen}
        onClose={() => { setIdeaModalOpen(false); setEditingIdea(null); }}
        idea={editingIdea}
      />

      <ContentPostModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setSchedulingIdea(null); }}
        ideaId={schedulingIdea?.id}
        defaultValues={{
          title: schedulingIdea?.title,
          format: 'ROLKA',
          platform: 'IG',
          status: 'POMYSL',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/admin/marketing/MarketingRolki.tsx
git commit -m "feat: add MarketingRolki ideas bank page"
```

---

### Task 12: Marketing.tsx - kontener glowny

**Files:**
- Create: `apps/web/src/pages/admin/Marketing.tsx`

- [ ] **Step 1: Utwórz Marketing.tsx**

```tsx
// apps/web/src/pages/admin/Marketing.tsx
import { useState } from 'react';
import { MarketingTabs } from '@/components/marketing/MarketingTabs';
import { MarketingKalendar } from './marketing/MarketingKalendar';
import { MarketingRolki } from './marketing/MarketingRolki';

const AVAILABLE_TABS = ['kalendarz', 'rolki'];

export const Marketing = () => {
  const [activeTab, setActiveTab] = useState('kalendarz');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Marketing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planowanie i zarzadzanie contentem social media
        </p>
      </div>

      <MarketingTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'kalendarz' && <MarketingKalendar />}
      {activeTab === 'rolki' && <MarketingRolki />}

      {!AVAILABLE_TABS.includes(activeTab) && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-semibold mb-2">Wkrotce</h3>
          <p className="text-muted-foreground text-sm">Ta sekcja jest w trakcie budowy.</p>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Sprawdz kompilacje TypeScript**

```bash
cd cosmo-app/apps/web
pnpm build 2>&1 | head -50
```

Oczekiwany wynik: brak bledow TypeScript

- [ ] **Step 3: Uruchom aplikacje i przetestuj manualnie**

```bash
cd cosmo-app
pnpm dev
```

Sprawdz w przegladarce:
- Otworz `/admin/marketing` - powinien sie wyrenderowac tytul i taby
- Kliknij tab "Rolki" - powinna sie pokazac tabela (pusta)
- Kliknij "Nowy pomysl" - powinien sie otworzyc modal
- Wroc do "Kalendarz" - FullCalendar powinien sie wyrenderowac
- Kliknij "+ Dodaj" - modal posta
- Sprawd sidebar - powinno byc "Marketing > Planowanie contentu"
- Sprawd mobile nav (zmniejsz okno do < 768px) - powinno byc "Marketing" w poziomej liscie

- [ ] **Step 4: Commit koncowy**

```bash
git add apps/web/src/pages/admin/Marketing.tsx
git commit -m "feat: add Marketing container page - completes marketing MVP sekcje 1-2"
```

---

## Podsumowanie plikow

| Plik | Status |
|------|--------|
| `apps/server/prisma/schema.prisma` | Zmodyfikowany |
| `apps/server/src/modules/marketing/marketing.service.ts` | Nowy |
| `apps/server/src/modules/marketing/marketing.service.test.ts` | Nowy |
| `apps/server/src/modules/marketing/marketing.controller.ts` | Nowy |
| `apps/server/src/modules/marketing/marketing.router.ts` | Nowy |
| `apps/server/src/app.ts` | Zmodyfikowany |
| `apps/web/src/types/marketing.types.ts` | Nowy |
| `apps/web/src/api/marketing.api.ts` | Nowy |
| `apps/web/src/components/marketing/MarketingTabs.tsx` | Nowy |
| `apps/web/src/components/marketing/ContentEventCard.tsx` | Nowy |
| `apps/web/src/components/marketing/ContentPostModal.tsx` | Nowy |
| `apps/web/src/components/marketing/RolkaIdeaModal.tsx` | Nowy |
| `apps/web/src/pages/admin/marketing/MarketingKalendar.tsx` | Nowy |
| `apps/web/src/pages/admin/marketing/MarketingRolki.tsx` | Nowy |
| `apps/web/src/pages/admin/Marketing.tsx` | Nowy |
| `apps/web/src/router.tsx` | Zmodyfikowany |
| `apps/web/src/components/layout/AdminLayout.tsx` | Zmodyfikowany |
