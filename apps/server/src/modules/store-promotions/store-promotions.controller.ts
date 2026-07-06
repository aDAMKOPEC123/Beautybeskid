import { Request, Response, NextFunction } from 'express';
import {
  createStorePromotionSchema,
  promotionActiveSchema,
  promotionFeaturedSchema,
  updateStorePromotionSchema,
} from '@cosmo/shared';
import * as service from './store-promotions.service';

export const getActive = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await service.getActivePromotions();
    res.json({ status: 'success', data: { promotions } });
  } catch (error) { next(error); }
};

export const getActiveCount = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await service.countActivePromotions();
    res.json({ status: 'success', data: { count } });
  } catch (error) { next(error); }
};

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await service.getAllPromotions();
    res.json({ status: 'success', data: { promotions } });
  } catch (error) { next(error); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createStorePromotionSchema.parse(req.body);
    const promotion = await service.createPromotion(data);
    res.status(201).json({ status: 'success', data: { promotion } });
  } catch (error) { next(error); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateStorePromotionSchema.parse(req.body);
    const promotion = await service.updatePromotion(req.params.id, data);
    res.json({ status: 'success', data: { promotion } });
  } catch (error) { next(error); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deletePromotion(req.params.id);
    res.status(204).send();
  } catch (error) { next(error); }
};

export const setActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = promotionActiveSchema.parse(req.body);
    const promotion = await service.setPromotionActive(req.params.id, isActive);
    res.json({ status: 'success', data: { promotion } });
  } catch (error) { next(error); }
};

export const setFeatured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isFeatured } = promotionFeaturedSchema.parse(req.body);
    const promotion = await service.setPromotionFeatured(req.params.id, isFeatured);
    res.json({ status: 'success', data: { promotion } });
  } catch (error) { next(error); }
};
