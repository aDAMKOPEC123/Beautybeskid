import path from 'path';
import { Request, Response, NextFunction } from 'express';
import * as certificatesService from './certificates.service';

export const getUserCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const certs = await certificatesService.getUserCertificates(userId);
    res.json({ data: certs });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const filePath = path.resolve(`uploads/certificates/${code}.pdf`);
    res.download(filePath, `certyfikat-${code}.pdf`, (err) => {
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await certificatesService.verifyCertificate(req.params.code);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};
