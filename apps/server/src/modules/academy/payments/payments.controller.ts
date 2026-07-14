import { NextFunction, Request, Response } from 'express';
import * as payments from './payments.service';

export const courseCheckout = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ data: await payments.createCourseCheckout(req.academyUser!.id, req.params.courseId, req.body) }); } catch (error) { next(error); } };
export const bundleCheckout = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ data: await payments.createBundleCheckout(req.academyUser!.id, req.params.bundleId, req.body) }); } catch (error) { next(error); } };
export const myOrders = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await payments.listMyOrders(req.academyUser!.id) }); } catch (error) { next(error); } };
export const myOrderStatus = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await payments.getMyOrderStatus(req.academyUser!.id, String(req.query.sessionId || '')) }); } catch (error) { next(error); } };
export const adminOrders = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await payments.adminListOrders({ status: String(req.query.status || 'ALL'), search: String(req.query.search || '').trim() }) }); } catch (error) { next(error); } };
export const adminRefund = async (req: Request, res: Response, next: NextFunction) => { try { res.status(202).json({ data: await payments.requestRefund(req.params.orderId, req.body.amount ? Number(req.body.amount) : undefined, req.body.reason) }); } catch (error) { next(error); } };
export const webhook = async (req: Request, res: Response, next: NextFunction) => { try { const signature = req.headers['stripe-signature']; if (typeof signature !== 'string') return res.status(400).json({ message: 'Brak podpisu Stripe' }); await payments.handleWebhook(req.body as Buffer, signature); res.json({ received: true }); } catch (error) { next(error); } };
