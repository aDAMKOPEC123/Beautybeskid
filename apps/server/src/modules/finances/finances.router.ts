import { Router } from 'express';
import * as controller from './finances.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', controller.getDashboard);
router.get('/revenues', controller.listRevenues);
router.post('/revenues', controller.createRevenue);
router.patch('/revenues/:id', controller.updateRevenue);
router.delete('/revenues/:id', controller.deleteRevenue);
router.get('/costs', controller.listCosts);
router.post('/costs', controller.createCost);
router.patch('/costs/:id', controller.updateCost);
router.delete('/costs/:id', controller.deleteCost);
router.get('/inventory', controller.getInventory);
router.post('/inventory/movements', controller.createInventoryMovement);
router.patch('/inventory/products/:id/settings', controller.updateInventorySettings);

export default router;
