import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requireEmployee } from '../../middleware/employee.middleware';
import {
  handleListBlocks,
  handleCreateBlock,
  handleDeleteBlock,
} from './calendar-blocks.controller';

const router = Router();

// Podgląd — pracownik lub admin
router.get('/', authenticate, requireEmployee, handleListBlocks);

// Zarządzanie — tylko admin
router.post('/', authenticate, requireAdmin, handleCreateBlock);
router.delete('/:id', authenticate, requireAdmin, handleDeleteBlock);

export default router;
