import { Router } from 'express';
import * as aboutController from './about.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.get('/', aboutController.getAbout);
router.put(
  '/',
  authenticate,
  requireAdmin,
  upload.fields([{ name: 'salonCoverImage', maxCount: 1 }, { name: 'ownerPhoto', maxCount: 1 }]),
  aboutController.updateAbout,
);

export default router;
