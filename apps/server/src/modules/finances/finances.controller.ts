import { Request, Response, NextFunction } from 'express';
import * as service from './finances.service';

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = String(req.query.month ?? '');
    res.json({ status: 'success', data: await service.getDashboard(month) });
  } catch (error) {
    next(error);
  }
};

export const listRevenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', data: { revenues: await service.listRevenues(String(req.query.month ?? '')) } });
  } catch (error) {
    next(error);
  }
};

export const createRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenue = await service.createRevenue(req.body);
    res.status(201).json({ status: 'success', data: { revenue } });
  } catch (error) {
    next(error);
  }
};

export const updateRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenue = await service.updateRevenue(req.params.id, req.body);
    res.json({ status: 'success', data: { revenue } });
  } catch (error) {
    next(error);
  }
};

export const deleteRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteRevenue(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const listCosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', data: { costs: await service.listCosts(String(req.query.month ?? '')) } });
  } catch (error) {
    next(error);
  }
};

export const createCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cost = await service.createCost(req.body);
    res.status(201).json({ status: 'success', data: { cost } });
  } catch (error) {
    next(error);
  }
};

export const updateCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cost = await service.updateCost(req.params.id, req.body);
    res.json({ status: 'success', data: { cost } });
  } catch (error) {
    next(error);
  }
};

export const deleteCost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteCost(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const getInventory = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', data: await service.getInventory() });
  } catch (error) {
    next(error);
  }
};

export const createInventoryMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movement = await service.createInventoryMovement(req.body);
    res.status(201).json({ status: 'success', data: { movement } });
  } catch (error) {
    next(error);
  }
};

export const updateInventorySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await service.updateInventorySettings(req.params.id, req.body);
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};
