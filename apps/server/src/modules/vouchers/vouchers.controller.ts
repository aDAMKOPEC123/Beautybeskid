import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from './vouchers.service';
import path from 'path';
import { prisma } from '../../config/prisma';

const createSchema = z.object({
  type: z.enum(['SERVICE', 'CASH']),
  serviceId: z.string().optional(),
  amount: z.number().min(1).max(9999).multipleOf(0.01).optional(),
  recipientName: z.string().max(80).optional(),
  senderName: z.string().max(80).optional(),
  message: z.string().max(120).optional(),
  validUntil: z.string().datetime().optional(),
}).refine(
  (d) => d.type !== 'SERVICE' || !!d.serviceId,
  { message: 'serviceId jest wymagane dla vouchera na usluge', path: ['serviceId'] }
).refine(
  (d) => d.type !== 'CASH' || (!!d.amount && d.amount >= 1),
  { message: 'amount jest wymagane dla vouchera gotowkowego', path: ['amount'] }
);

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const adminId = (req as any).user.id;
    const voucher = await service.createVoucher(data, adminId);
    res.status(201).json(voucher);
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.listVouchers(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = await service.getVoucherPdfPath(req.params.id);
    const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="voucher-${voucher?.code ?? req.params.id}.pdf"`
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
};

export const getPdfByCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code || '');
    if (!code) {
      res.status(400).json({ status: 'error', message: 'Podaj kod vouchera' });
      return;
    }

    const voucher = await service.lookupVoucherByCode(code);
    const filePath = await service.getVoucherPdfPath(voucher.id);
    res.setHeader('Content-Disposition', `inline; filename="voucher-${voucher.code}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    next(err);
  }
};

export const adjust = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, amount } = req.body as { action: 'realize' | 'deduct'; amount?: number };
    const voucher = await service.adjustVoucher(id, action, amount);
    res.json({ status: 'success', data: { voucher } });
  } catch (err) {
    next(err);
  }
};

export const lookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.query.code || '');
    if (!code) { res.status(400).json({ status: 'error', message: 'Podaj kod vouchera' }); return; }
    const voucher = await service.lookupVoucherByCode(code);
    res.json({ status: 'success', data: { voucher } });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteVoucher(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
