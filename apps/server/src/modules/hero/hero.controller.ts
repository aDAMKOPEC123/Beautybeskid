import { Request, Response, NextFunction } from 'express';
import * as heroService from './hero.service';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

export const getSlides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slides = await heroService.getActiveSlides();
    res.json({ status: 'success', data: { slides } });
  } catch (error) {
    next(error);
  }
};

export const getAllSlides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slides = await heroService.getAllSlides();
    res.json({ status: 'success', data: { slides } });
  } catch (error) {
    next(error);
  }
};

export const createSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Zdjęcie jest wymagane', 400);
    const cropX = req.body.cropX !== undefined ? Number(req.body.cropX) : undefined;
    const cropY = req.body.cropY !== undefined ? Number(req.body.cropY) : undefined;
    const imagePath = await processAndSaveImage(req.file.buffer, 'hero', { cropX, cropY });
    const { title, heading, subtitle, textPosition, fontStyle, buttons, isMain } = req.body;
    const slide = await heroService.createSlide({
      imagePath,
      title: title || undefined,
      heading: heading || undefined,
      subtitle: subtitle || undefined,
      textPosition: textPosition || undefined,
      fontStyle: fontStyle || undefined,
      buttons: buttons ? JSON.parse(buttons) : undefined,
      isMain: isMain === 'true',
    });
    res.status(201).json({ status: 'success', data: { slide } });
  } catch (error) {
    next(error);
  }
};

export const setMain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slide = await heroService.setMainSlide(req.params.id);
    res.json({ status: 'success', data: { slide } });
  } catch (error) {
    next(error);
  }
};

export const updateSlide = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, heading, subtitle, textPosition, fontStyle, buttons, isActive, order } = req.body;
    const slide = await heroService.updateSlide(req.params.id, {
      title,
      heading: heading ?? undefined,
      subtitle: subtitle ?? undefined,
      textPosition: textPosition ?? undefined,
      fontStyle: fontStyle ?? undefined,
      buttons: buttons !== undefined ? JSON.parse(buttons) : undefined,
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
    await heroService.deleteSlide(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
