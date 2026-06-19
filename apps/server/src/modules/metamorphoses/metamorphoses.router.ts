// filepath: apps/server/src/modules/metamorphoses/metamorphoses.router.ts
import { Router } from 'express';
import * as metamorphosesController from './metamorphoses.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.get('/', metamorphosesController.getAll);

router.use(authenticate, requireAdmin);

router.post(
  '/', 
  upload.fields([{ name: 'beforeImage', maxCount: 1 }, { name: 'afterImage', maxCount: 1 }]), 
  metamorphosesController.create
);
router.delete('/:id', metamorphosesController.remove);

export default router;
