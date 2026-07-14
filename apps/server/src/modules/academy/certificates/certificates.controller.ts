import path from 'path';
import { Request, Response, NextFunction } from 'express';
import * as certificatesService from './certificates.service';

export const getUserCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const certs = await certificatesService.getUserCertificates(userId);
    res.json({ data: certs });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const certificate = await certificatesService.getCertificateForDownload(
      code,
      req.academyUser!.id,
      req.academyUser!.role === 'ADMIN'
    );
    const filePath = path.resolve('uploads', 'certificates', `${certificate.verificationCode}.pdf`);
    res.download(filePath, `certyfikat-${certificate.verificationCode}.pdf`, (err) => {
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
export const adminList = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await certificatesService.adminListCertificates() }); } catch (error) { next(error); } };
export const revoke = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await certificatesService.revokeCertificate(req.params.code, String(req.body.reason || '')) }); } catch (error) { next(error); } };
export const reissue = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ data: await certificatesService.reissueCertificate(req.params.code) }); } catch (error) { next(error); } };
