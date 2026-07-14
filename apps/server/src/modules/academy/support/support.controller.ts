import { Request, Response, NextFunction } from 'express';
import * as support from './support.service';
import { AppError } from '../../../middleware/error.middleware';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export const myThread = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await support.getMyThread(req.academyUser!.id) }); } catch (error) { next(error); } };
export const sendMine = async (req: Request, res: Response, next: NextFunction) => { try { const content = text(req.body.content); if (!content) throw new AppError('Wiadomość nie może być pusta', 400); res.status(201).json({ data: await support.sendUserMessage(req.academyUser!.id, content) }); } catch (error) { next(error); } };
export const adminThreads = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await support.listAdminThreads() }); } catch (error) { next(error); } };
export const sendAsAdmin = async (req: Request, res: Response, next: NextFunction) => { try { const content = text(req.body.content); if (!content) throw new AppError('Wiadomość nie może być pusta', 400); res.status(201).json({ data: await support.sendAdminMessage(req.academyUser!.id, req.params.threadId, content) }); } catch (error) { next(error); } };
