import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAcademyAccess } from '../../../middleware/academy.middleware';
import * as certificatesController from './certificates.controller';

const router = Router();

// Public: verify certificate (no auth needed)
router.get('/certificates/verify/:code', certificatesController.verifyCertificate);

// Authenticated + academy access
router.get('/certificates', authenticate, requireAcademyAccess, certificatesController.getUserCertificates);
router.get('/certificates/download/:code', authenticate, requireAcademyAccess, certificatesController.downloadCertificate);

export default router;
