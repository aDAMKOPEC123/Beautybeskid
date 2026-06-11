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
