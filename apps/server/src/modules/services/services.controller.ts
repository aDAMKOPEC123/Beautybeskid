// filepath: apps/server/src/modules/services/services.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as servicesService from './services.service';
import { createServiceSchema, updateServiceSchema } from '@cosmo/shared';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

const parseServicePayload = (req: Request) => {
  let dataToValidate: any;
  try {
    dataToValidate = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
  } catch {
    throw new AppError('Nieprawidłowy format danych JSON', 400);
  }

  if (dataToValidate.price !== undefined) dataToValidate.price = Number(dataToValidate.price);
  if (dataToValidate.durationMinutes !== undefined) {
    dataToValidate.durationMinutes = Number(dataToValidate.durationMinutes);
  }
  if (dataToValidate.displayOrder !== undefined) {
    dataToValidate.displayOrder = Number(dataToValidate.displayOrder);
  }
  if (dataToValidate.recommendedIntervalDays !== undefined && dataToValidate.recommendedIntervalDays !== null) {
    dataToValidate.recommendedIntervalDays = Number(dataToValidate.recommendedIntervalDays);
  }
  if (dataToValidate.isActive !== undefined) {
    dataToValidate.isActive = dataToValidate.isActive === 'true' || dataToValidate.isActive === true;
  }
  if (dataToValidate.isMultiVisit !== undefined) {
    dataToValidate.isMultiVisit =
      dataToValidate.isMultiVisit === 'true' || dataToValidate.isMultiVisit === true;
  }
  if (Array.isArray(dataToValidate.seriesIntervalsDays)) {
    dataToValidate.seriesIntervalsDays = dataToValidate.seriesIntervalsDays.map((value: unknown) => Number(value));
  } else if (typeof dataToValidate.seriesIntervalsDays === 'string') {
    try {
      dataToValidate.seriesIntervalsDays = JSON.parse(dataToValidate.seriesIntervalsDays).map((value: unknown) => Number(value));
    } catch {
      throw new AppError('Nieprawidłowy format seriesIntervalsDays', 400);
    }
  }
  if (dataToValidate.promoDiscountValue !== undefined) {
    dataToValidate.promoDiscountValue = dataToValidate.promoDiscountValue ? Number(dataToValidate.promoDiscountValue) : null;
  }
  if (dataToValidate.promoDiscountType !== undefined && !dataToValidate.promoDiscountType) {
    dataToValidate.promoDiscountType = null;
    dataToValidate.promoDiscountValue = null;
    dataToValidate.promoStartDate = null;
    dataToValidate.promoEndDate = null;
    dataToValidate.promoMaxUses = null;
  }
  if (dataToValidate.promoMaxUses !== undefined) {
    dataToValidate.promoMaxUses = dataToValidate.promoMaxUses ? Number(dataToValidate.promoMaxUses) : null;
  }
  if (dataToValidate.promoStartDate !== undefined) {
    dataToValidate.promoStartDate = dataToValidate.promoStartDate ? new Date(dataToValidate.promoStartDate) : null;
  }
  if (dataToValidate.promoEndDate !== undefined) {
    dataToValidate.promoEndDate = dataToValidate.promoEndDate ? new Date(dataToValidate.promoEndDate) : null;
  }
  if (req.body.employeeIds && typeof req.body.employeeIds === 'string') {
    try {
      dataToValidate.employeeIds = JSON.parse(req.body.employeeIds);
    } catch {
      throw new AppError('Nieprawidłowy format employeeIds', 400);
    }
  }

  return dataToValidate;
};

export const getAll = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await servicesService.getAllServices();
    res.status(200).json({ status: 'success', data: { services } });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await servicesService.getServiceBySlug(req.params.slug);
    res.status(200).json({ status: 'success', data: { service } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createServiceSchema.parse(parseServicePayload(req));
    let service = await servicesService.createService(validatedData);

    if (req.file) {
      const imagePath = await processAndSaveImage(req.file.buffer, 'services');
      service = await servicesService.updateServiceImage(service.id, imagePath);
    }

    res.status(201).json({ status: 'success', data: { service } });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateServiceSchema.parse(parseServicePayload(req));
    let service = await servicesService.updateService(req.params.id, validatedData);

    if (req.file) {
      const imagePath = await processAndSaveImage(req.file.buffer, 'services');
      service = await servicesService.updateServiceImage(service.id, imagePath);
    }

    res.status(200).json({ status: 'success', data: { service } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await servicesService.deleteService(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku', 400);
    const imagePath = await processAndSaveImage(req.file.buffer, 'services');
    res.json({ url: imagePath });
  } catch (error) {
    next(error);
  }
};
