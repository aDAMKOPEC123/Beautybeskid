// apps/server/src/modules/forum/forum.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as forumService from './forum.service';

export const forumController = {
  // ─── Categories ─────────────────────────────────────────────────────────────
  getCategories: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.getCategories();
      res.json(data);
    } catch (err) { next(err); }
  },

  createCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.createCategory(req.body);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  updateCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.updateCategory(req.params.id, req.body);
      res.json(data);
    } catch (err) { next(err); }
  },

  deleteCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await forumService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // ─── Threads ─────────────────────────────────────────────────────────────────
  getThreadsByCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = (req as any).user?.role === 'ADMIN';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as 'newest' | 'active' | 'popular') || 'newest';
      const data = await forumService.getThreadsByCategory(req.params.slug, page, limit, sort, isAdmin);
      res.json(data);
    } catch (err) { next(err); }
  },

  createThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const data = await forumService.createThread(userId, req.body);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  getThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = (req as any).user?.role === 'ADMIN';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await forumService.getThread(req.params.id, page, limit, isAdmin);
      res.json(data);
    } catch (err) { next(err); }
  },

  deleteThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === 'ADMIN';
      await forumService.softDeleteThread(userId, req.params.id, isAdmin);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  pinThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.pinThread(req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  lockThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.lockThread(req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  moveThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await forumService.moveThread(req.params.id, req.body.categoryId);
      res.json(data);
    } catch (err) { next(err); }
  },

  getAdminThreads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter = (req.query.filter as 'all' | 'admin-mention' | 'deleted' | 'pinned') || 'all';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await forumService.getAdminThreads(filter, page, limit);
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── Posts ───────────────────────────────────────────────────────────────────
  createPost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { content, isAnonymous } = req.body;
      const data = await forumService.createPost(userId, req.params.id, content, isAnonymous ?? false);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  deletePost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === 'ADMIN';
      await forumService.softDeletePost(userId, req.params.id, isAdmin);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  adminDeletePost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      await forumService.softDeletePost(userId, req.params.id, true);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  adminDeleteThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      await forumService.softDeleteThread(userId, req.params.id, true);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  // ─── Watch ───────────────────────────────────────────────────────────────────
  toggleWatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const data = await forumService.toggleWatch(userId, req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  getWatchStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const data = await forumService.getWatchStatus(userId, req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },
};
