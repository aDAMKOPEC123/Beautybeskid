import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';
import * as controller from './store-promotions.controller';

const router = Router();

router.use(authenticate);

router.get('/active/count', controller.getActiveCount);
router.get('/active', controller.getActive);
router.post('/:id/events', controller.trackEvent);
router.post('/:id/favorite', controller.save);
router.delete('/:id/favorite', controller.unsave);
router.post('/:id/reminder', controller.setReminder);
router.delete('/:id/reminder', controller.removeReminder);

router.use(requireAdmin);
router.post('/upload-image', upload.single('image'), controller.uploadImage);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.post('/:id/duplicate', controller.duplicate);
router.patch('/:id/active', controller.setActive);
router.patch('/:id/featured', controller.setFeatured);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
