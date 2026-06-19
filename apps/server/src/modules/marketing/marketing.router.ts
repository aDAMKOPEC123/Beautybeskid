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

router.get('/karuzele', ctrl.listKaruzele);
router.post('/karuzele', ctrl.createKaruzela);
router.patch('/karuzele/:id', ctrl.updateKaruzela);
router.delete('/karuzele/:id', ctrl.deleteKaruzela);
router.post('/karuzele/:id/schedule', ctrl.scheduleKaruzela);

router.get('/trendy', ctrl.listTrendy);
router.post('/trendy', ctrl.createTrend);
router.patch('/trendy/:id', ctrl.updateTrend);
router.delete('/trendy/:id', ctrl.deleteTrend);

router.get('/opisy', ctrl.listOpisy);
router.post('/opisy', ctrl.createOpis);
router.patch('/opisy/:id', ctrl.updateOpis);
router.delete('/opisy/:id', ctrl.deleteOpis);

router.get('/nagrania', ctrl.listNagrania);
router.post('/nagrania', ctrl.createNagranie);
router.patch('/nagrania/:id', ctrl.updateNagranie);
router.delete('/nagrania/:id', ctrl.deleteNagranie);

router.get('/kampanie', ctrl.listKampanie);
router.post('/kampanie', ctrl.createKampania);
router.patch('/kampanie/:id', ctrl.updateKampania);
router.delete('/kampanie/:id', ctrl.deleteKampania);

router.get('/wyniki', ctrl.listWyniki);
router.post('/wyniki', ctrl.createWynik);
router.patch('/wyniki/:id', ctrl.updateWynik);
router.delete('/wyniki/:id', ctrl.deleteWynik);

export default router;
