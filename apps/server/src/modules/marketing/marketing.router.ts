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
