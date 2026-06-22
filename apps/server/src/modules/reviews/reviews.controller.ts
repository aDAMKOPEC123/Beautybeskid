// filepath: apps/server/src/modules/reviews/reviews.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as reviewsService from './reviews.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewsService.createReview(req.user!.id, req.body);
    res.status(201).json({ status: 'success', data: { review } });
  } catch (error) {
    next(error);
  }
};

export const getServiceReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const data = await reviewsService.getServiceReviews(req.params.serviceId, page, limit);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};

export const getPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appointments = await reviewsService.getPendingReviews(req.user!.id);
    res.status(200).json({ status: 'success', data: { appointments } });
  } catch (error) {
    next(error);
  }
};

export const toggleVisibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewsService.toggleVisibility(req.params.id);
    res.status(200).json({ status: 'success', data: { review } });
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const data = await reviewsService.getAllReviews(page, limit);
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};
