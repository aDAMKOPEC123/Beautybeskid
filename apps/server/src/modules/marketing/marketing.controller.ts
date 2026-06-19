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
  TrendStatus,
  NagranieStatus,
  Priority,
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

// ============ Karuzele ============

export const listKaruzele = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, status } = req.query as Record<string, string>;
    const items = await service.getKaruzele({
      category: category as IdeaCategory | undefined,
      status: status as IdeaStatus | undefined,
    });
    res.json(items);
  } catch (e) { next(e); }
};

export const createKaruzela = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createKaruzela(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateKaruzela = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateKaruzela(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteKaruzela = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteKaruzela(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

export const scheduleKaruzela = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await service.scheduleKaruzela(req.params.id, req.body);
    res.status(201).json(post);
  } catch (e) { next(e); }
};

// ============ Trendy ============

export const listTrendy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform, status } = req.query as Record<string, string>;
    const items = await service.getTrendy({
      platform: platform as SocialPlatform | undefined,
      status: status as TrendStatus | undefined,
    });
    res.json(items);
  } catch (e) { next(e); }
};

export const createTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createTrend(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateTrend(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteTrend(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

// ============ Opisy ============

export const listOpisy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query as Record<string, string>;
    const items = await service.getOpisy({
      category: category as IdeaCategory | undefined,
    });
    res.json(items);
  } catch (e) { next(e); }
};

export const createOpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createOpis(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateOpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateOpis(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteOpis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteOpis(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

// ============ Nagrania ============

export const listNagrania = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority } = req.query as Record<string, string>;
    const items = await service.getNagrania({
      status: status as NagranieStatus | undefined,
      priority: priority as Priority | undefined,
    });
    res.json(items);
  } catch (e) { next(e); }
};

export const createNagranie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createNagranie(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateNagranie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateNagranie(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteNagranie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteNagranie(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

// ============ Kampanie ============

export const listKampanie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await service.getKampanie();
    res.json(items);
  } catch (e) { next(e); }
};

export const createKampania = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createKampania(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateKampania = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateKampania(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteKampania = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteKampania(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};

// ============ Wyniki ============

export const listWyniki = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { platform } = req.query as Record<string, string>;
    const items = await service.getWyniki({
      platform: platform as SocialPlatform | undefined,
    });
    res.json(items);
  } catch (e) { next(e); }
};

export const createWynik = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.createWynik(req.body);
    res.status(201).json(item);
  } catch (e) { next(e); }
};

export const updateWynik = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await service.updateWynik(req.params.id, req.body);
    res.json(item);
  } catch (e) { next(e); }
};

export const deleteWynik = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteWynik(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
};
