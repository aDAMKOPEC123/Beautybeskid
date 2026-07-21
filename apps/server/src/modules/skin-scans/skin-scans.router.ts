import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { upload } from '../../config/multer';
import * as controller from './skin-scans.controller';

const router = Router();

router.use(authenticate);
router.get('/', controller.listSessions);
router.post('/', controller.createSession);
router.get('/:id', controller.getSession);
router.post(
  '/:id/images',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'left', maxCount: 1 },
    { name: 'right', maxCount: 1 },
    { name: 'forehead', maxCount: 1 },
    { name: 'left_cheek', maxCount: 1 },
    { name: 'right_cheek', maxCount: 1 },
    { name: 'chin', maxCount: 1 },
    { name: 'neck', maxCount: 1 },
  ]),
  controller.uploadImages,
);
router.post('/:id/complete', controller.completeSession);
router.delete('/:id', controller.deleteSession);

export default router;
