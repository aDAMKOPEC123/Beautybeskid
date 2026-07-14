import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../../../config/prisma', () => ({
  prisma: { academyCertificate: { findUnique } },
}));

import { generatePDF, getCertificateForDownload } from './certificates.service';

describe('getCertificateForDownload', () => {
  beforeEach(() => findUnique.mockReset());

  it('allows the certificate owner to download it', async () => {
    findUnique.mockResolvedValue({ userId: 'user-1', verificationCode: 'valid-code', status: 'ACTIVE' });
    await expect(getCertificateForDownload('valid-code', 'user-1')).resolves.toEqual({ userId: 'user-1', verificationCode: 'valid-code', status: 'ACTIVE' });
  });

  it('rejects another academy user', async () => {
    findUnique.mockResolvedValue({ userId: 'user-1', verificationCode: 'valid-code', status: 'ACTIVE' });
    await expect(getCertificateForDownload('valid-code', 'user-2')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows an administrator', async () => {
    findUnique.mockResolvedValue({ userId: 'user-1', verificationCode: 'valid-code', status: 'ACTIVE' });
    await expect(getCertificateForDownload('valid-code', 'admin-1', true)).resolves.toBeTruthy();
  });

  it('generates a PDF with Polish characters and a verification QR code', async () => {
    const pdf = await generatePDF({ recipientName: 'Łucja Żółć', title: 'Pielęgnacja skóry wrażliwej', code: 'test-code-123', issuedAt: new Date('2026-07-14') });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
