import { Request, Response, NextFunction } from 'express';
import * as aboutService from './about.service';
import { processAndSaveImage } from '../../utils/imageProcessor';

export const getAbout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const about = await aboutService.getAbout();
    res.status(200).json({ status: 'success', data: { about } });
  } catch (error) {
    next(error);
  }
};

export const updateAbout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.body.data;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw ?? {};

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    let salonCoverImage: string | undefined;
    let ownerPhoto: string | undefined;

    if (files?.salonCoverImage?.[0]) {
      salonCoverImage = await processAndSaveImage(files.salonCoverImage[0].buffer, 'about');
    }
    if (files?.ownerPhoto?.[0]) {
      ownerPhoto = await processAndSaveImage(files.ownerPhoto[0].buffer, 'about');
    }

    const about = await aboutService.upsertAbout(data, salonCoverImage, ownerPhoto);
    res.status(200).json({ status: 'success', data: { about } });
  } catch (error) {
    next(error);
  }
};
