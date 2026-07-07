import { Request, Response, NextFunction } from 'express';
import {
  createStorePromotionSchema,
  promotionActiveSchema,
  promotionEventSchema,
  promotionFeaturedSchema,
  updateStorePromotionSchema,
} from '@cosmo/shared';
import * as service from './store-promotions.service';

export const getActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await service.getActivePromotions(req.user!.id);
    res.json({ status: 'success', data: { promotions } });
  } catch (error) { next(error); }
};

export const getActiveCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await service.countActivePromotions(req.user!.id);
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
    const promotion = await service.createPromotion(data, req.user!.id);
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

export const duplicate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotion = await service.duplicatePromotion(req.params.id, req.user!.id);
    res.status(201).json({ status: 'success', data: { promotion } });
  } catch (error) { next(error); }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageUrl = await service.uploadPromotionImage(req.file);
    res.status(201).json({ status: 'success', data: { imageUrl } });
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

export const trackEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = promotionEventSchema.parse(req.body);
    await service.trackPromotionEvent(req.params.id, req.user?.id, type);
    res.status(204).send();
  } catch (error) { next(error); }
};

export const save = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const favorite = await service.savePromotion(req.params.id, req.user!.id);
    res.status(201).json({ status: 'success', data: { favorite } });
  } catch (error) { next(error); }
};

export const unsave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.unsavePromotion(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) { next(error); }
};

export const setReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminder = await service.setPromotionReminder(req.params.id, req.user!.id);
    res.status(201).json({ status: 'success', data: { reminder } });
  } catch (error) { next(error); }
};

export const removeReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.removePromotionReminder(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) { next(error); }
};
