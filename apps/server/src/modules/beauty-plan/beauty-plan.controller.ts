import type { Request, Response, NextFunction } from 'express';
import * as beautyPlanService from './beauty-plan.service';

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAllPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await beautyPlanService.getAllPlans();
    res.json({ status: 'success', data: { plans } });
  } catch (err) {
    next(err);
  }
};

export const getPlanByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await beautyPlanService.getPlanByUser(req.params.userId);
    res.json({ status: 'success', data: { plan } });
  } catch (err) {
    next(err);
  }
};

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await beautyPlanService.createPlan(
      req.params.userId,
      req.user!.id,
      req.body,
    );
    res.status(201).json({ status: 'success', data: { plan } });
  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await beautyPlanService.updatePlan(req.params.id, req.body);
    res.json({ status: 'success', data: { plan } });
  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await beautyPlanService.deletePlan(req.params.id);
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const uploadSectionImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'Brak pliku' });
      return;
    }
    const imagePath = await beautyPlanService.uploadSectionImage(
      req.params.id,
      req.params.sectionId,
      req.file.buffer,
    );
    res.json({ status: 'success', data: { imagePath } });
  } catch (err) {
    next(err);
  }
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const getMyPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await beautyPlanService.getMyPlan(req.user!.id);
    res.json({ status: 'success', data: { plan } });
  } catch (err) {
    next(err);
  }
};
