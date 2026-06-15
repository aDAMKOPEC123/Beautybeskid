// filepath: apps/server/src/modules/chat/chat.router.ts
import { Router } from 'express';
import * as chatController from './chat.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireStaff } from '../../middleware/staff.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { chatUpload } from '../../config/chatUpload';

const router = Router();

router.use(authenticate);

router.get('/my-room', chatController.getMyRoom);
router.post('/messages', chatUpload.single('file'), chatController.sendMessageREST);
router.post('/rooms/:id/read', chatController.markAsRead);

router.get('/rooms', requireStaff, chatController.getRooms);
router.get('/rooms/:id/messages', requireStaff, chatController.getRoomMessages);

// Admin-only: delete a chat room and all its messages + files
router.delete('/rooms/:id', requireAdmin, chatController.deleteRoom);

export default router;
