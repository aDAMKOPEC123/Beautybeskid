import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as consultationsService from './consultations.service';

const createLeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(9),
  consentContact: z.literal(true),
  consentData: z.literal(true),
});

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const lead = await consultationsService.createLead(data as any);
    res.status(201).json({ status: 'success', data: { lead } });
  } catch (error) {
    next(error);
  }
};

export const getActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await consultationsService.getActiveLeads();
    res.status(200).json({ status: 'success', data: { leads } });
  } catch (error) {
    next(error);
  }
};

export const getArchived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await consultationsService.getArchivedLeads();
    res.status(200).json({ status: 'success', data: { leads } });
  } catch (error) {
    next(error);
  }
};

export const markContacted = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await consultationsService.markContacted(req.params.id);
    res.status(200).json({ status: 'success', data: { lead } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await consultationsService.deleteLead(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
