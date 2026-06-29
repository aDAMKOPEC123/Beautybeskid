import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { generateVoucherPdf } from './vouchers.pdf';
import fs from 'fs/promises';
import path from 'path';

export function buildVoucherCode(seg1: string, seg2: string): string {
  return `VCH-${seg1}-${seg2}`;
}

export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return buildVoucherCode(seg(4), seg(4));
}

async function uniqueVoucherCode(maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateVoucherCode();
    const existing = await prisma.voucher.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new AppError('Nie udało się wygenerować unikalnego kodu. Spróbuj ponownie.', 500);
}

export type CreateVoucherInput = {
  type: 'SERVICE' | 'CASH';
  serviceId?: string;
  amount?: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
  validUntil?: string;
};

export const createVoucher = async (data: CreateVoucherInput, adminId: string) => {
  const validUntil = data.validUntil
    ? new Date(data.validUntil)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // Validate service if SERVICE type
  let service: { id: string; name: string; description: string | null; isActive: boolean } | null = null;
  if (data.type === 'SERVICE') {
    if (!data.serviceId) throw new AppError('Wybierz usługę', 400);
    service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { id: true, name: true, description: true, isActive: true },
    });
    if (!service || !service.isActive) throw new AppError('Usługa nie istnieje lub jest nieaktywna', 400);
  } else {
    if (!data.amount || data.amount < 1 || data.amount > 9999)
      throw new AppError('Podaj prawidłową kwotę (1–9999 zł)', 400);
  }

  const code = await uniqueVoucherCode();

  // Phase 1: DB transaction — create DiscountCode (if SERVICE) + Voucher
  const voucher = await prisma.$transaction(async (tx) => {
    let discountCodeId: string | undefined;

    if (data.type === 'SERVICE') {
      const dc = await tx.discountCode.create({
        data: {
          code,
          discountType: 'PERCENTAGE',
          discountValue: 100,
          isMultiUse: false,
          isActive: true,
          expiresAt: validUntil,
        },
      });
      discountCodeId = dc.id;
    }

    return tx.voucher.create({
      data: {
        type: data.type,
        code,
        serviceId: data.serviceId,
        amount: data.amount ? data.amount : undefined,
        recipientName: data.recipientName,
        senderName: data.senderName,
        message: data.message,
        validUntil,
        discountCodeId,
        createdById: adminId,
        pdfPath: null,
      },
      include: { service: { select: { name: true, description: true } } },
    });
  });

  // Phase 2: Generate PDF outside transaction
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'vouchers');
    await fs.mkdir(uploadsDir, { recursive: true });
    const pdfBuffer = await generateVoucherPdf(voucher as any);
    const pdfPath = `vouchers/${voucher.id}.pdf`;
    await fs.writeFile(path.join(process.cwd(), 'uploads', pdfPath), pdfBuffer);
    await prisma.voucher.update({ where: { id: voucher.id }, data: { pdfPath } });
    return { ...voucher, pdfPath };
  } catch (err) {
    console.error('[vouchers] PDF generation failed:', err);
    return voucher;
  }
};

export const listVouchers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.voucher.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { service: { select: { name: true } } },
    }),
    prisma.voucher.count(),
  ]);
  return { data, totalPages: Math.ceil(total / limit), total };
};

export const deleteVoucher = async (id: string) => {
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { discountCode: { include: { usages: { take: 1 } } } },
  });
  if (!voucher) throw new AppError('Voucher nie istnieje', 404);

  if (voucher.discountCode && voucher.discountCode.usages.length > 0) {
    throw new AppError('Voucher został już wykorzystany — nie można usunąć', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.voucher.delete({ where: { id } });
    if (voucher.discountCodeId) {
      await tx.discountCode.delete({ where: { id: voucher.discountCodeId } });
    }
  });

  // Delete PDF file (ignore if not found)
  if (voucher.pdfPath) {
    const fullPath = path.join(process.cwd(), 'uploads', voucher.pdfPath);
    await fs.unlink(fullPath).catch(() => {});
  }
};

export const getVoucherPdfPath = async (id: string): Promise<string> => {
  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { service: { select: { name: true, description: true } } },
  });
  if (!voucher) throw new AppError('Voucher nie istnieje', 404);

  // If pdfPath exists and file is on disk, return it
  if (voucher.pdfPath) {
    const fullPath = path.join(process.cwd(), 'uploads', voucher.pdfPath);
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {}
  }

  // Regenerate PDF
  const uploadsDir = path.join(process.cwd(), 'uploads', 'vouchers');
  await fs.mkdir(uploadsDir, { recursive: true });
  const pdfBuffer = await generateVoucherPdf(voucher as any);
  const pdfPath = `vouchers/${voucher.id}.pdf`;
  const fullPath = path.join(process.cwd(), 'uploads', pdfPath);
  await fs.writeFile(fullPath, pdfBuffer);
  await prisma.voucher.update({ where: { id }, data: { pdfPath } });
  return fullPath;
};
