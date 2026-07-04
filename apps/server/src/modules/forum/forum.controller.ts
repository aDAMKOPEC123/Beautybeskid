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
      const isAdmin = req.user?.role === 'ADMIN';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const VALID_SORTS = ['newest', 'active', 'popular'] as const;
      type SortType = typeof VALID_SORTS[number];
      const sortParam = req.query.sort as string;
      const sort: SortType = (VALID_SORTS as readonly string[]).includes(sortParam) ? sortParam as SortType : 'newest';
      const data = await forumService.getThreadsByCategory(req.params.slug, page, limit, sort, isAdmin);
      res.json(data);
    } catch (err) { next(err); }
  },

  createThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isAnonymous = req.body.isAnonymous === true;
      const data = await forumService.createThread(userId, { ...req.body, isAnonymous });
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  getThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await forumService.getThread(req.params.id, page, limit, isAdmin, req.user?.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  deleteThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
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
      const VALID_FILTERS = ['all', 'admin-mention', 'deleted', 'pinned'] as const;
      type FilterType = typeof VALID_FILTERS[number];
      const filterParam = req.query.filter as string;
      const filter: FilterType = (VALID_FILTERS as readonly string[]).includes(filterParam) ? filterParam as FilterType : 'all';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await forumService.getAdminThreads(filter, page, limit);
      res.json(data);
    } catch (err) { next(err); }
  },

  // ─── Posts ───────────────────────────────────────────────────────────────────
  createPost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { content, quotedPostId, quotedContent } = req.body;
      const isAnonymous = req.body.isAnonymous === true;
      const data = await forumService.createPost(userId, req.params.id, content, isAnonymous, quotedPostId, quotedContent);
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  deletePost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      await forumService.softDeletePost(userId, req.params.id, isAdmin);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  adminDeletePost: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await forumService.softDeletePost(userId, req.params.id, true);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  adminDeleteThread: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      await forumService.softDeleteThread(userId, req.params.id, true);
      res.status(204).send();
    } catch (err) { next(err); }
  },

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

  // ─── Watch ───────────────────────────────────────────────────────────────────
  toggleWatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await forumService.toggleWatch(userId, req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },

  getWatchStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data = await forumService.getWatchStatus(userId, req.params.id);
      res.json(data);
    } catch (err) { next(err); }
  },
};
