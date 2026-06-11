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
