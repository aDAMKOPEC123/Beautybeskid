// apps/server/src/modules/forum/forum.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { forumController as c } from './forum.controller';

const router = Router();

// All forum routes require authentication
router.use(authenticate);

// ─── Categories (public read, admin write) ────────────────────────────────────
router.get('/categories', c.getCategories);
router.post('/categories', requireAdmin, c.createCategory);
router.patch('/categories/:id', requireAdmin, c.updateCategory);
router.delete('/categories/:id', requireAdmin, c.deleteCategory);

// ─── Threads ──────────────────────────────────────────────────────────────────
router.get('/categories/:slug/threads', c.getThreadsByCategory);
router.post('/threads', c.createThread);
router.get('/threads/:id', c.getThread);
router.delete('/threads/:id', c.deleteThread);

// ─── Thread moderation (admin) ────────────────────────────────────────────────
router.patch('/threads/:id/pin', requireAdmin, c.pinThread);
router.patch('/threads/:id/lock', requireAdmin, c.lockThread);
router.patch('/threads/:id/move', requireAdmin, c.moveThread);

// ─── Watch routes ─────────────────────────────────────────────────────────────
router.post('/threads/:id/watch', c.toggleWatch);
router.get('/threads/:id/watch', c.getWatchStatus);

// ─── Posts ────────────────────────────────────────────────────────────────────
router.post('/threads/:id/posts', c.createPost);
router.delete('/posts/:id', c.deletePost);
router.post('/posts/:id/react', c.reactToPost);

// ─── Search, Tags, Stats ──────────────────────────────────────────────────────
router.get('/search', c.searchThreads);
router.get('/tags', c.getPopularTags);
router.get('/stats', c.getForumStats);

// ─── User profile ─────────────────────────────────────────────────────────────
router.get('/users/:userId/threads', c.getUserThreads);

// ─── Admin endpoints ──────────────────────────────────────────────────────────
router.get('/admin/threads', requireAdmin, c.getAdminThreads);
router.delete('/admin/threads/:id', requireAdmin, c.adminDeleteThread);
router.delete('/admin/posts/:id', requireAdmin, c.adminDeletePost);

export { router as forumRouter };
