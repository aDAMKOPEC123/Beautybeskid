// filepath: apps/server/src/modules/metamorphoses/metamorphoses.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as metamorphosesService from './metamorphoses.service';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metamorphoses = await metamorphosesService.getAllMetamorphoses();
    res.status(200).json({ status: 'success', data: { metamorphoses } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files?.beforeImage?.[0] || !files?.afterImage?.[0]) {
      throw new AppError('Zarówno zdjęcie przed, jak i po są wymagane', 400);
    }
    
    // We assume multipart form data here since files are uploaded
    const title = req.body.title;
    const description = req.body.description;
    const serviceId = req.body.serviceId;
    const isPublished = req.body.isPublished === 'true';

    if (!title) throw new AppError('Tytuł jest wymagany', 400);

    const beforeImagePath = await processAndSaveImage(files.beforeImage[0].buffer, 'metamorphoses');
    const afterImagePath = await processAndSaveImage(files.afterImage[0].buffer, 'metamorphoses');

    const metamorphosis = await metamorphosesService.createMetamorphosis({
      title,
      description,
      serviceId,
      isPublished,
      beforeImage: beforeImagePath,
      afterImage: afterImagePath
    });

    res.status(201).json({ status: 'success', data: { metamorphosis } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await metamorphosesService.deleteMetamorphosis(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
