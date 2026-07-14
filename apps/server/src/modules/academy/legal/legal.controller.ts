import { AcademyLegalDocumentType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../middleware/error.middleware';
import * as legal from './legal.service';

const slugTypes: Record<string, AcademyLegalDocumentType> = {
  regulamin: 'TERMS',
  prywatnosc: 'PRIVACY',
  'polityka-prywatnosci': 'PRIVACY',
  cookies: 'COOKIES',
  odstapienie: 'WITHDRAWAL',
  reklamacje: 'COMPLAINTS',
  dostepnosc: 'ACCESSIBILITY',
};
const clean = (value: unknown, max = 10_000) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export const publicDocument = async (req: Request, res: Response, next: NextFunction) => { try {
  const type = slugTypes[req.params.slug];
  if (!type) throw new AppError('Nieznany dokument', 404);
  res.json({ data: await legal.getPublicDocument(type) });
} catch (error) { next(error); } };

export const commerceInfo = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await legal.getPublicCommerceInfo() }); } catch (error) { next(error); } };
export const adminGet = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await legal.adminGetLegal() }); } catch (error) { next(error); } };
export const adminSeller = async (req: Request, res: Response, next: NextFunction) => { try {
  const required = ['legalName', 'displayName', 'street', 'postalCode', 'city', 'country', 'email', 'phone'] as const;
  const data: Record<string, string | null> = {};
  for (const key of required) {
    const value = clean(req.body[key], 200);
    if (!value) throw new AppError(`Uzupełnij pole ${key}`, 400);
    data[key] = value;
  }
  data.taxId = clean(req.body.taxId, 20) || null;
  data.registryNumber = clean(req.body.registryNumber, 30) || null;
  res.json({ data: await legal.adminUpdateSeller(data) });
} catch (error) { next(error); } };
export const adminDocument = async (req: Request, res: Response, next: NextFunction) => { try {
  const title = clean(req.body.title, 200);
  const content = clean(req.body.content, 80_000);
  const version = clean(req.body.version, 40);
  if (!title || !content || !version) throw new AppError('Tytuł, treść i wersja są wymagane', 400);
  res.json({ data: await legal.adminUpdateDocument(req.params.id, { title, content, version, publish: req.body.publish === true }) });
} catch (error) { next(error); } };
