import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import * as controller from './store-promotions.controller';

const router = Router();

router.use(authenticate);

router.get('/active/count', controller.getActiveCount);
router.get('/active', controller.getActive);

router.use(requireAdmin);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id/active', controller.setActive);
router.patch('/:id/featured', controller.setFeatured);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
