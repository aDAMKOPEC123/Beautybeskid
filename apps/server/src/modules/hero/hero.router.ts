import { Router } from 'express';
import * as heroController from './hero.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

// Public — get active slides for home page
router.get('/', heroController.getSlides);

// Admin only
router.use(authenticate, requireAdmin);
router.get('/all', heroController.getAllSlides);
router.post('/', upload.single('image'), heroController.createSlide);
router.patch('/:id/main', heroController.setMain);
router.patch('/:id', heroController.updateSlide);
router.delete('/:id', heroController.deleteSlide);

export default router;
