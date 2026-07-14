import { Router } from 'express';
import * as service from './academy-auth.service';
import { academyAuthenticate } from '../../../middleware/academy-auth.middleware';

const router = Router();
const cookie = (res: any, token: string) => res.cookie('academy_refresh_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/academy/auth', maxAge: 30 * 24 * 60 * 60 * 1000 });
router.get('/google-config', (_req, res) => res.json({ data: { clientId: process.env.GOOGLE_CLIENT_ID ?? null } }));
router.post('/register', async (req, res, next) => { try { const result = await service.register(req.body); cookie(res, result.refreshToken); res.status(201).json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/login', async (req, res, next) => { try { const result = await service.login(req.body); cookie(res, result.refreshToken); res.json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/google', async (req, res, next) => { try { const result = await service.loginWithGoogle(req.body); cookie(res, result.refreshToken); res.json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/verify-email', async (req, res, next) => { try { await service.verifyEmail(req.body.token); res.status(204).end(); } catch (error) { next(error); } });
router.post('/resend-verification', academyAuthenticate, async (req, res, next) => { try { await service.resendVerification(req.academyUser!.id); res.status(204).end(); } catch (error) { next(error); } });
router.post('/forgot-password', async (req, res, next) => { try { await service.requestPasswordReset(String(req.body.email || '')); res.status(204).end(); } catch (error) { next(error); } });
router.post('/reset-password', async (req, res, next) => { try { await service.resetPassword(String(req.body.token || ''), String(req.body.password || '')); res.status(204).end(); } catch (error) { next(error); } });
router.post('/refresh', async (req, res, next) => { try { const result = await service.refresh(req.cookies.academy_refresh_token); cookie(res, result.refreshToken); res.json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/logout', async (req, res, next) => { try { await service.logout(req.cookies.academy_refresh_token); res.clearCookie('academy_refresh_token', { path: '/api/academy/auth' }); res.status(204).end(); } catch (error) { next(error); } });
export default router;
