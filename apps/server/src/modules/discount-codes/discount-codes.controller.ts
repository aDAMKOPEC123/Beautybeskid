import { Request, Response, NextFunction } from 'express';
import * as service from './discount-codes.service';
import { AppError } from '../../middleware/error.middleware';

export const getAllCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codes = await service.getAllCodes();
    res.json({ status: 'success', data: { codes } });
  } catch (err) { next(err); }
};

export const createCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = await service.createCode(req.body);
    res.status(201).json({ status: 'success', data: { code } });
  } catch (err) { next(err); }
};

export const toggleCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = await service.toggleCode(req.params.id, req.body.isActive);
    res.json({ status: 'success', data: { code } });
  } catch (err) { next(err); }
};

export const deleteCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deactivateCode(req.params.id);
    res.json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

export const validateCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code ?? '').trim();
    if (!code) throw new AppError('Kod rabatowy jest wymagany', 400);
    const discountCode = await service.validateCode(code, req.user!.id);
    res.json({ status: 'success', data: { discountCode } });
  } catch (err) { next(err); }
};

export const getWelcomeCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await service.getWelcomeCoupon(req.user!.id);
    res.json({ status: 'success', data: { coupon } });
  } catch (err) { next(err); }
};

export const getAmbassadorConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await service.getAmbassadorConfig();
    res.json({ status: 'success', data: { config } });
  } catch (err) { next(err); }
};

export const updateAmbassadorConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await service.updateAmbassadorConfig(req.body);
    res.json({ status: 'success', data: { config } });
  } catch (err) { next(err); }
};

export const getReferralBenefits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const benefits = await service.getReferralBenefits();
    res.json({ status: 'success', data: { benefits } });
  } catch (err) { next(err); }
};