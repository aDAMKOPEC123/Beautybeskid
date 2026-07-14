import { Router } from 'express';
import * as service from './academy-auth.service';

const router = Router();
const cookie = (res: any, token: string) => res.cookie('academy_refresh_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/academy/auth', maxAge: 30 * 24 * 60 * 60 * 1000 });
router.post('/register', async (req, res, next) => { try { const result = await service.register(req.body); cookie(res, result.refreshToken); res.status(201).json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/login', async (req, res, next) => { try { const result = await service.login(req.body); cookie(res, result.refreshToken); res.json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/refresh', async (req, res, next) => { try { const result = await service.refresh(req.cookies.academy_refresh_token); cookie(res, result.refreshToken); res.json({ data: { accessToken: result.accessToken, user: result.user } }); } catch (error) { next(error); } });
router.post('/logout', async (req, res, next) => { try { await service.logout(req.cookies.academy_refresh_token); res.clearCookie('academy_refresh_token', { path: '/api/academy/auth' }); res.status(204).end(); } catch (error) { next(error); } });
export default router;
