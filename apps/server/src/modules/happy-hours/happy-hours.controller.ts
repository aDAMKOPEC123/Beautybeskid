import { Request, Response, NextFunction } from 'express';
import {
  getHappyHours,
  getActiveHappyHours,
  createHappyHour,
  updateHappyHour,
  deleteHappyHour,
  toggleHappyHour,
} from './happy-hours.service';

export const handleGetActiveHappyHours = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await getActiveHappyHours();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const handleGetHappyHours = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await getHappyHours();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const handleCreateHappyHour = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await createHappyHour(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

export const handleUpdateHappyHour = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await updateHappyHour(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const handleDeleteHappyHour = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await deleteHappyHour(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const handleToggleHappyHour = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await toggleHappyHour(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
