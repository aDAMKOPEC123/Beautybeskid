import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as controller from './legal.controller';

const router = Router();
router.get('/public/legal/commerce-info', controller.commerceInfo);
router.get('/public/legal/:slug', controller.publicDocument);
router.get('/admin/legal', academyAuthenticate, academyRequireAdmin, controller.adminGet);
router.patch('/admin/legal/seller', academyAuthenticate, academyRequireAdmin, controller.adminSeller);
router.patch('/admin/legal/documents/:id', academyAuthenticate, academyRequireAdmin, controller.adminDocument);
export default router;
