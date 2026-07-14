import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as certificatesController from './certificates.controller';

const router = Router();

// Public: verify certificate (no auth needed)
router.get('/certificates/verify/:code', certificatesController.verifyCertificate);

// Authenticated + academy access
router.get('/certificates', academyAuthenticate, certificatesController.getUserCertificates);
router.get('/certificates/download/:code', academyAuthenticate, certificatesController.downloadCertificate);
router.get('/admin/certificates', academyAuthenticate, academyRequireAdmin, certificatesController.adminList);
router.post('/admin/certificates/:code/revoke', academyAuthenticate, academyRequireAdmin, certificatesController.revoke);
router.post('/admin/certificates/:code/reissue', academyAuthenticate, academyRequireAdmin, certificatesController.reissue);

export default router;
