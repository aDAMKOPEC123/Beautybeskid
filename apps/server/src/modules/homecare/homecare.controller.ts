import type { Request, Response } from 'express';
import * as homecareService from './homecare.service';

export const getRoutine = async (req: Request, res: Response) => {
  const routine = await homecareService.getRoutine(req.params.appointmentId);
  res.json({ status: 'success', data: { routine } });
};

export const updateRoutine = async (req: Request, res: Response) => {
  const routine = await homecareService.updateRoutine(req.params.appointmentId, req.body);
  res.json({ status: 'success', data: { routine } });
};

export const sendRoutine = async (req: Request, res: Response) => {
  const routine = await homecareService.sendRoutine(req.params.appointmentId);
  res.json({ status: 'success', data: { routine } });
};

export const createRoutineDraft = async (req: Request, res: Response) => {
  const routine = await homecareService.createRoutineDraft(req.params.appointmentId);
  res.json({ status: 'success', data: { routine } });
};

export const getMyRoutines = async (req: Request, res: Response) => {
  const routines = await homecareService.getMyRoutines(req.user!.id);
  res.json({ status: 'success', data: { routines } });
};

export const getUnreadCount = async (req: Request, res: Response) => {
  const count = await homecareService.getUnreadCount(req.user!.id);
  res.json({ status: 'success', data: { count } });
};

export const markViewed = async (req: Request, res: Response) => {
  await homecareService.markViewed(req.user!.id);
  res.json({ status: 'success' });
};

export const deleteMyRoutine = async (req: Request, res: Response) => {
  await homecareService.deleteMyRoutine(req.params.id, req.user!.id);
  res.json({ status: 'success' });
};
