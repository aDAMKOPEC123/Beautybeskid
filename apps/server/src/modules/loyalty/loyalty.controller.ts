// filepath: apps/server/src/modules/loyalty/loyalty.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as loyaltyService from './loyalty.service';
import { adjustPointsSchema, redeemRewardSchema, createLoyaltyRewardSchema, updateUserTierSchema } from '@cosmo/shared';
import { AppError } from '../../middleware/error.middleware';

export const getRewards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rewards = await loyaltyService.getRewards();
    res.status(200).json({ status: 'success', data: { rewards } });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await loyaltyService.getUserStats(req.user!.id);
    res.status(200).json({ status: 'success', data: { stats } });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await loyaltyService.getHistory(req.user!.id);
    res.status(200).json({ status: 'success', data: { history } });
  } catch (error) {
    next(error);
  }
};

export const redeem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = redeemRewardSchema.parse(req.body);
    const coupon = await loyaltyService.activateCoupon(req.user!.id, validatedData);
    res.status(200).json({ status: 'success', data: { coupon } });
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await loyaltyService.getActiveCoupons(req.user!.id);
    res.status(200).json({ status: 'success', data: { coupons } });
  } catch (error) {
    next(error);
  }
};

export const useCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const coupon = await loyaltyService.markCouponUsed(id);
    res.status(200).json({ status: 'success', data: { coupon } });
  } catch (error) {
    next(error);
  }
};

export const adjust = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = adjustPointsSchema.parse(req.body);
    const result = await loyaltyService.adjustPoints(validatedData);
    res.status(200).json({ status: 'success', data: { result } });
  } catch (error) {
    next(error);
  }
};

export const createReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createLoyaltyRewardSchema.parse(req.body);
    const reward = await loyaltyService.createReward(validatedData);
    res.status(201).json({ status: 'success', data: { reward } });
  } catch (error) {
    next(error);
  }
};

export const deleteReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await loyaltyService.deleteReward(id);
    res.status(200).json({ status: 'success', message: 'Usunięto nagrodę' });
  } catch (error) {
    next(error);
  }
};

export const updateTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { tier } = updateUserTierSchema.parse(req.body);
    const newTier = await loyaltyService.updateUserTier(id, tier);
    res.status(200).json({ status: 'success', data: { tier: newTier } });
  } catch (error) {
    next(error);
  }
};

export const validateVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code || '');
    if (!code) throw new AppError('Brak kodu', 400);
    const serviceId = req.query.serviceId ? String(req.query.serviceId) : undefined;
    const voucher = await loyaltyService.validateVoucher(code, req.user!.id, serviceId);
    res.status(200).json({ status: 'success', data: { voucher } });
  } catch (error) {
    next(error);
  }
};
