import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock MUST be at module top level (outside describe) for vitest hoisting to work
vi.mock('../../config/prisma', () => ({
  default: {
    voucher: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    discountCode: { delete: vi.fn() },
    $transaction: vi.fn(async (fn: any) =>
      fn({ voucher: { delete: vi.fn() }, discountCode: { delete: vi.fn() } })
    ),
  },
}));

import { generateVoucherCode, buildVoucherCode, deleteVoucher } from './vouchers.service';
import prisma from '../../config/prisma';

describe('buildVoucherCode', () => {
  it('formats segments into VCH-XXXX-XXXX', () => {
    expect(buildVoucherCode('AB12', 'CD34')).toBe('VCH-AB12-CD34');
  });
});

describe('generateVoucherCode', () => {
  it('returns code matching VCH-XXXX-XXXX pattern', () => {
    const code = generateVoucherCode();
    expect(code).toMatch(/^VCH-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('returns unique codes on multiple calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateVoucherCode()));
    expect(codes.size).toBe(20);
  });
});

describe('deleteVoucher', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 404 if voucher not found', async () => {
    (prisma.voucher.findUnique as any).mockResolvedValue(null);
    await expect(deleteVoucher('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 if service voucher code already used', async () => {
    (prisma.voucher.findUnique as any).mockResolvedValue({
      id: 'v1', pdfPath: null, discountCodeId: 'dc1',
      discountCode: { id: 'dc1', usages: [{ id: 'u1' }] },
    });
    await expect(deleteVoucher('v1')).rejects.toMatchObject({ statusCode: 400 });
  });
});
