import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { Prisma } from '@prisma/client';
import {
  SocialPlatform,
  ContentFormat,
  ContentStatus,
  IdeaCategory,
  IdeaType,
  IdeaStatus,
  TrendStatus,
  NagranieStatus,
  Priority,
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
  const where: Prisma.ContentPostWhereInput = {};
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
  const where: Prisma.RolkaIdeaWhereInput = {};
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
  const { id: _id, createdAt: _c, updatedAt: _u, plannedDate: _pd, ...rest } = idea;
  return prisma.rolkaIdea.create({
    data: {
      ...rest,
      status: 'POMYSL',
      plannedDate: undefined,
    },
  });
};

// ============ Karuzele ============

export interface CreateKaruzelaDto {
  title: string;
  slideDesc?: string;
  category: IdeaCategory;
  status: IdeaStatus;
  plannedDate?: string;
}

export interface KaruzelaFilters {
  category?: IdeaCategory;
  status?: IdeaStatus;
}

export const getKaruzele = async (filters: KaruzelaFilters) => {
  const where: Prisma.KaruzelaIdeaWhereInput = {};
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  return prisma.karuzelaIdea.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { post: { select: { id: true, scheduledAt: true, status: true } } },
  });
};

export const createKaruzela = async (data: CreateKaruzelaDto) => {
  return prisma.karuzelaIdea.create({
    data: {
      ...data,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
    },
  });
};

export const updateKaruzela = async (id: string, data: Partial<CreateKaruzelaDto>) => {
  const exists = await prisma.karuzelaIdea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Karuzela nie znaleziona', 404);
  return prisma.karuzelaIdea.update({
    where: { id },
    data: {
      ...data,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
    },
  });
};

export const deleteKaruzela = async (id: string) => {
  const exists = await prisma.karuzelaIdea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Karuzela nie znaleziona', 404);
  return prisma.karuzelaIdea.delete({ where: { id } });
};

export const scheduleKaruzela = async (id: string, data: CreatePostDto) => {
  const existing = await prisma.contentPost.findUnique({ where: { karuzelaId: id } });
  if (existing) throw new AppError('Pomysl jest juz zaplanowany', 409);
  return prisma.contentPost.create({
    data: {
      ...data,
      scheduledAt: new Date(data.scheduledAt),
      karuzelaId: id,
    },
  });
};

// ============ Trendy ============

export interface CreateTrendDto {
  name: string;
  platform: SocialPlatform;
  link?: string;
  status: TrendStatus;
  notes?: string;
}

export interface TrendFilters {
  platform?: SocialPlatform;
  status?: TrendStatus;
}

export const getTrendy = async (filters: TrendFilters) => {
  const where: Prisma.TrendWhereInput = {};
  if (filters.platform) where.platform = filters.platform;
  if (filters.status) where.status = filters.status;
  return prisma.trend.findMany({ where, orderBy: { createdAt: 'desc' } });
};

export const createTrend = async (data: CreateTrendDto) => {
  return prisma.trend.create({ data });
};

export const updateTrend = async (id: string, data: Partial<CreateTrendDto>) => {
  const exists = await prisma.trend.findUnique({ where: { id } });
  if (!exists) throw new AppError('Trend nie znaleziony', 404);
  return prisma.trend.update({ where: { id }, data });
};

export const deleteTrend = async (id: string) => {
  const exists = await prisma.trend.findUnique({ where: { id } });
  if (!exists) throw new AppError('Trend nie znaleziony', 404);
  return prisma.trend.delete({ where: { id } });
};

// ============ Opisy ============

export interface CreateOpisDto {
  title: string;
  content: string;
  hashtags?: string;
  category: IdeaCategory;
}

export const getOpisy = async (filters: { category?: IdeaCategory }) => {
  const where: Prisma.OpisPostWhereInput = {};
  if (filters.category) where.category = filters.category;
  return prisma.opisPost.findMany({ where, orderBy: { createdAt: 'desc' } });
};

export const createOpis = async (data: CreateOpisDto) => {
  return prisma.opisPost.create({ data });
};

export const updateOpis = async (id: string, data: Partial<CreateOpisDto>) => {
  const exists = await prisma.opisPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Opis nie znaleziony', 404);
  return prisma.opisPost.update({ where: { id }, data });
};

export const deleteOpis = async (id: string) => {
  const exists = await prisma.opisPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Opis nie znaleziony', 404);
  return prisma.opisPost.delete({ where: { id } });
};

// ============ Nagrania ============

export interface CreateNagranieDto {
  title: string;
  rolkaId?: string;
  karuzelaId?: string;
  status: NagranieStatus;
  priority: Priority;
}

export const getNagrania = async (filters: { status?: NagranieStatus; priority?: Priority }) => {
  const where: Prisma.NagranieItemWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  return prisma.nagranieItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      rolka: { select: { id: true, title: true } },
      karuzela: { select: { id: true, title: true } },
    },
  });
};

export const createNagranie = async (data: CreateNagranieDto) => {
  return prisma.nagranieItem.create({
    data,
    include: {
      rolka: { select: { id: true, title: true } },
      karuzela: { select: { id: true, title: true } },
    },
  });
};

export const updateNagranie = async (id: string, data: Partial<CreateNagranieDto>) => {
  const exists = await prisma.nagranieItem.findUnique({ where: { id } });
  if (!exists) throw new AppError('Nagranie nie znalezione', 404);
  return prisma.nagranieItem.update({
    where: { id },
    data,
    include: {
      rolka: { select: { id: true, title: true } },
      karuzela: { select: { id: true, title: true } },
    },
  });
};

export const deleteNagranie = async (id: string) => {
  const exists = await prisma.nagranieItem.findUnique({ where: { id } });
  if (!exists) throw new AppError('Nagranie nie znalezione', 404);
  return prisma.nagranieItem.delete({ where: { id } });
};

// ============ Kampanie ============

export interface CreateKampaniaDto {
  name: string;
  goal?: string;
  dateFrom?: string;
  dateTo?: string;
  platform: SocialPlatform;
  notes?: string;
}

export const getKampanie = async () => {
  return prisma.kampania.findMany({ orderBy: { createdAt: 'desc' } });
};

export const createKampania = async (data: CreateKampaniaDto) => {
  return prisma.kampania.create({
    data: {
      ...data,
      dateFrom: data.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data.dateTo ? new Date(data.dateTo) : undefined,
    },
  });
};

export const updateKampania = async (id: string, data: Partial<CreateKampaniaDto>) => {
  const exists = await prisma.kampania.findUnique({ where: { id } });
  if (!exists) throw new AppError('Kampania nie znaleziona', 404);
  return prisma.kampania.update({
    where: { id },
    data: {
      ...data,
      dateFrom: data.dateFrom ? new Date(data.dateFrom) : undefined,
      dateTo: data.dateTo ? new Date(data.dateTo) : undefined,
    },
  });
};

export const deleteKampania = async (id: string) => {
  const exists = await prisma.kampania.findUnique({ where: { id } });
  if (!exists) throw new AppError('Kampania nie znaleziona', 404);
  return prisma.kampania.delete({ where: { id } });
};

// ============ Wyniki ============

export interface CreateWynikDto {
  postId?: string;
  title: string;
  platform: SocialPlatform;
  publishedAt: string;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
}

export const getWyniki = async (filters: { platform?: SocialPlatform }) => {
  const where: Prisma.WynikPostWhereInput = {};
  if (filters.platform) where.platform = filters.platform;
  return prisma.wynikPost.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    include: { post: { select: { id: true, title: true } } },
  });
};

export const createWynik = async (data: CreateWynikDto) => {
  return prisma.wynikPost.create({
    data: {
      ...data,
      publishedAt: new Date(data.publishedAt),
    },
    include: { post: { select: { id: true, title: true } } },
  });
};

export const updateWynik = async (id: string, data: Partial<CreateWynikDto>) => {
  const exists = await prisma.wynikPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Wynik nie znaleziony', 404);
  return prisma.wynikPost.update({
    where: { id },
    data: {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
    },
    include: { post: { select: { id: true, title: true } } },
  });
};

export const deleteWynik = async (id: string) => {
  const exists = await prisma.wynikPost.findUnique({ where: { id } });
  if (!exists) throw new AppError('Wynik nie znaleziony', 404);
  return prisma.wynikPost.delete({ where: { id } });
};
