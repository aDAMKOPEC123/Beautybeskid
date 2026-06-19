import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

export const getSlides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slides = await service.getActiveSlides();
    res.json({ status: 'success', data: { slides } });
  } catch (error) {
    next(error);
  }
};

export const getAllSlides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slides = await service.getAllSlides();
    res.json({ status: 'success', data: { slides } });
  } catch (error) {
    next(error);
  }
};

export const createSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Zdjęcie jest wymagane', 400);
    const { serviceId, description } = req.body;
    if (!serviceId) throw new AppError('Zabieg jest wymagany', 400);
    if (!description?.trim()) throw new AppError('Opis jest wymagany', 400);

    const cropX = req.body.cropX !== undefined ? Number(req.body.cropX) : undefined;
    const cropY = req.body.cropY !== undefined ? Number(req.body.cropY) : undefined;
    const imagePath = await processAndSaveImage(req.file.buffer, 'recommended', { cropX, cropY });

    const slide = await service.createSlide({ serviceId, description: description.trim(), imagePath });
    res.status(201).json({ status: 'success', data: { slide } });
  } catch (error) {
    next(error);
  }
};

export const updateSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, isActive, order } = req.body;
    const slide = await service.updateSlide(req.params.id, {
      description: description?.trim() || undefined,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : undefined,
      order: order !== undefined ? Number(order) : undefined,
    });
    res.json({ status: 'success', data: { slide } });
  } catch (error) {
    next(error);
  }
};

export const deleteSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteSlide(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
