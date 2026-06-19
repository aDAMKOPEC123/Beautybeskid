// filepath: apps/server/src/modules/services/services.router.ts
import { Router } from 'express';
import * as servicesController from './services.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.get('/', servicesController.getAll);
router.get('/:slug', servicesController.getOne);

router.use(authenticate, requireAdmin);

router.post('/upload-image', upload.single('image'), servicesController.uploadImage);
router.post('/', upload.single('image'), servicesController.create);
router.put('/:id', upload.single('image'), servicesController.update);
router.delete('/:id', servicesController.remove);

export default router;
