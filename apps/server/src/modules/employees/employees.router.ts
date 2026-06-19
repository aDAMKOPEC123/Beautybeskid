import { Router } from 'express';
import * as ctrl from './employees.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { requireEmployee } from '../../middleware/employee.middleware';
import { upload } from '../../config/multer';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', ctrl.getAll);
router.get('/availability/month', ctrl.getMonthAvailability);
router.get('/availability', ctrl.getAvailability);
router.get('/next-available', ctrl.getNextAvailable);
router.get('/week-slots-count', ctrl.getWeekSlotsCount);

// ─── Employee self-service (EMPLOYEE or ADMIN) ────────────────────────────────
router.get('/me/schedule', authenticate, requireEmployee, ctrl.getMySchedule);
router.post('/me/schedule', authenticate, requireEmployee, ctrl.upsertMyWorkDay);
router.delete('/me/schedule/:dayId', authenticate, requireEmployee, ctrl.removeMyWorkDay);
router.get('/me/appointments', authenticate, requireEmployee, ctrl.getMyAppointments);
router.get('/me/weekly-schedule', authenticate, requireEmployee, ctrl.getMyWeeklySchedule);
router.put('/me/weekly-schedule', authenticate, requireEmployee, ctrl.upsertMyWeeklyDay);

// ─── Admin: employee CRUD + accounts + schedule ───────────────────────────────
router.post('/', authenticate, requireAdmin, upload.single('avatar'), ctrl.create);
router.patch('/:id', authenticate, requireAdmin, upload.single('avatar'), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

router.post('/:id/create-account', authenticate, requireAdmin, ctrl.createAccount);
router.delete('/:id/account', authenticate, requireAdmin, ctrl.revokeAccount);

router.get('/:id/schedule', authenticate, requireAdmin, ctrl.getSchedule);
router.post('/:id/schedule', authenticate, requireAdmin, ctrl.upsertWorkDay);
router.delete('/:id/schedule/:dayId', authenticate, requireAdmin, ctrl.removeWorkDay);
router.get('/:id/weekly-schedule', authenticate, requireAdmin, ctrl.getEmployeeWeeklySchedule);
router.put('/:id/weekly-schedule', authenticate, requireAdmin, ctrl.upsertEmployeeWeeklyDay);

export default router;
