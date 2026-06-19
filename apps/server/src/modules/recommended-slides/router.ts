import { Router } from 'express';
import * as controller from './controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

// Public — active slides for client dashboard
router.get('/', controller.getSlides);

// Admin only
router.use(authenticate, requireAdmin);
router.get('/all', controller.getAllSlides);
router.post('/', upload.single('image'), controller.createSlide);
router.patch('/:id', controller.updateSlide);
router.delete('/:id', controller.deleteSlide);

export default router;
