// filepath: apps/server/src/modules/auth/auth.router.ts
import { Router } from 'express';
import * as authController from './auth.controller';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import { upload } from '../../config/multer';

const router = Router();

router.post('/register', authRateLimiter, upload.single('avatar'), authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.post('/google', authRateLimiter, authController.googleAuth);
router.get('/google/registration', authRateLimiter, authController.googleRegistrationDetails);
router.post('/google/registration', authRateLimiter, authController.completeGoogleRegistration);
router.get('/facebook/status', authController.facebookStatus);
router.get('/facebook', authRateLimiter, authController.startFacebookAuth);
router.get('/facebook/callback', authRateLimiter, authController.facebookCallback);
router.get('/facebook/registration', authRateLimiter, authController.facebookRegistrationDetails);
router.post('/facebook/registration', authRateLimiter, authController.completeFacebookRegistration);
router.get('/verify-email', authController.verifyEmail);

export default router;
