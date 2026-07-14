import { Router } from 'express';
import { academyAuthenticate } from '../../../middleware/academy-auth.middleware';
import * as certificatesController from './certificates.controller';

const router = Router();

// Public: verify certificate (no auth needed)
router.get('/certificates/verify/:code', certificatesController.verifyCertificate);

// Authenticated + academy access
router.get('/certificates', academyAuthenticate, certificatesController.getUserCertificates);
router.get('/certificates/download/:code', academyAuthenticate, certificatesController.downloadCertificate);

export default router;
