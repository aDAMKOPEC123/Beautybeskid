import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/staff.middleware';
import * as homecareController from './homecare.controller';

const router = Router();

// User: get their sent routines
router.get('/my', authenticate, homecareController.getMyRoutines);
router.get('/unread-count', authenticate, homecareController.getUnreadCount);
router.post('/mark-viewed', authenticate, homecareController.markViewed);
router.delete('/my/:id', authenticate, homecareController.deleteMyRoutine);

// Staff (admin/employee): manage routine for an appointment
router.post('/:appointmentId', authenticate, requireStaff, homecareController.createRoutineDraft);
router.get('/:appointmentId', authenticate, requireStaff, homecareController.getRoutine);
router.put('/:appointmentId', authenticate, requireStaff, homecareController.updateRoutine);
router.post('/:appointmentId/send', authenticate, requireStaff, homecareController.sendRoutine);

export default router;
