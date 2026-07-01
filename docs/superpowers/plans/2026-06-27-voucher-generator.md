# Voucher Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a voucher generator to the admin panel at `/admin/vouchery` that produces stylish A5 PDF gift vouchers (service 100% or cash) in the site's brand colors.

**Architecture:** New Prisma `Voucher` model + `VoucherType` enum; new `vouchers` backend module (router/controller/service/pdf); new `AdminVouchery.tsx` frontend page with Generator + Historia tabs; `expiresAt` field added to existing `DiscountCode` model.

**Tech Stack:** pdf-lib (server, already installed), nanoid (server, already installed), vitest (server tests), React 19 + TypeScript + Tailwind (frontend)

**Spec:** `docs/superpowers/specs/2026-06-27-voucher-generator-design.md`

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `apps/server/src/modules/vouchers/vouchers.service.ts` | Business logic: create, list, delete, PDF path resolution |
| `apps/server/src/modules/vouchers/vouchers.pdf.ts` | pdf-lib PDF generation (A5 landscape, ivory+green) |
| `apps/server/src/modules/vouchers/vouchers.controller.ts` | HTTP handlers (thin layer, delegates to service) |
| `apps/server/src/modules/vouchers/vouchers.router.ts` | Express router with auth/admin guards |
| `apps/server/src/modules/vouchers/vouchers.service.test.ts` | vitest unit tests for service logic |
| `apps/web/src/api/vouchers.api.ts` | Frontend API calls (create, list, delete, pdf URL) |
| `apps/web/src/components/voucher/VoucherPreview.tsx` | Live HTML preview component matching PDF proportions |
| `apps/web/src/pages/admin/AdminVouchery.tsx` | Full admin page (Generator + Historia tabs) |

### Modify
| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add `VoucherType` enum, `Voucher` model, `expiresAt` on `DiscountCode`, relations on `Service`/`User`/`DiscountCode` |
| `apps/server/src/modules/discount-codes/discount-codes.service.ts` | Add `expiresAt` check in `validateCode` |
| `apps/server/src/app.ts` | Import + register `vouchersRouter` at `/api/vouchers` |
| `apps/web/src/router.tsx` | Add `{ path: 'vouchery', element: <S><AdminVouchery /></S> }` under AdminLayout |
| `apps/web/src/components/layout/AdminLayout.tsx` | Add "Vouchery" link at line ~153 (desktop) and ~428 (mobile Sprzedaż section) |

---

## Task 1: DB Schema — Add Voucher model and expiresAt to DiscountCode

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add VoucherType enum and Voucher model to schema**

Open `apps/server/prisma/schema.prisma`. Add after the last enum (around the bottom of the file):

```prisma
enum VoucherType {
  SERVICE
  CASH
}

model Voucher {
  id             String       @id @default(cuid())
  type           VoucherType
  recipientName  String?
  senderName     String?
  message        String?
  serviceId      String?
  service        Service?     @relation("VoucherService", fields: [serviceId], references: [id])
  amount         Decimal?     @db.Decimal(10, 2)
  discountCodeId String?      @unique
  discountCode   DiscountCode? @relation("VoucherDiscountCode", fields: [discountCodeId], references: [id])
  code           String       @unique
  validUntil     DateTime
  pdfPath        String?
  createdAt      DateTime     @default(now())
  createdById    String?
  createdBy      User?        @relation("VoucherCreatedBy", fields: [createdById], references: [id])
}
```

- [ ] **Step 2: Add expiresAt to DiscountCode model**

In the `DiscountCode` model block, add after the `updatedAt` line:
```prisma
  expiresAt      DateTime?
  voucher        Voucher?     @relation("VoucherDiscountCode")
```

- [ ] **Step 3: Add relations on Service and User models**

In the `Service` model, add:
```prisma
  vouchers       Voucher[]    @relation("VoucherService")
```

In the `User` model, add:
```prisma
  createdVouchers Voucher[]   @relation("VoucherCreatedBy")
```

- [ ] **Step 4: Run migration**

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate
# When prompted for migration name: add_voucher_model
```

Expected: migration succeeds, `prisma generate` runs automatically.

- [ ] **Step 5: Verify generated client has Voucher**

```bash
grep -r "VoucherType\|createVoucher\|findManyVoucher" node_modules/.prisma/client/index.d.ts | head -5
```

Expected: lines containing `VoucherType` and `voucher` methods.

---

## Task 2: Add expiresAt check to validateCode

**Files:**
- Modify: `apps/server/src/modules/discount-codes/discount-codes.service.ts`
- Create: `apps/server/src/modules/vouchers/vouchers.service.test.ts` (start file here)

- [ ] **Step 1: Write failing test for expiry check**

Create `apps/server/src/modules/vouchers/vouchers.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll test the validateCode behavior indirectly via discount-codes module
// and voucher creation logic inline here.

describe('discount code expiry via validateCode', () => {
  it('should be tested after expiresAt check is added', () => {
    // Placeholder — we test service functions directly below
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (placeholder)**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/vouchers/vouchers.service.test.ts
```

Expected: PASS (placeholder test).

- [ ] **Step 3: Add expiresAt check in validateCode**

In `apps/server/src/modules/discount-codes/discount-codes.service.ts`, find the `validateCode` function (line ~44). After the `if (!discountCode.isActive)` check, add:

```typescript
  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    throw new AppError('Ten kod rabatowy wygasł', 400);
  }
```

- [ ] **Step 4: Write real test for generateVoucherCode helper**

Replace the placeholder in `vouchers.service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

// Helper we'll export from vouchers.service.ts
import { generateVoucherCode, buildVoucherCode } from './vouchers.service';

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

describe('buildVoucherCode', () => {
  it('formats segments into VCH-XXXX-XXXX', () => {
    expect(buildVoucherCode('AB12', 'CD34')).toBe('VCH-AB12-CD34');
  });
});
```

- [ ] **Step 5: Run test to verify it fails (functions not yet created)**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/vouchers/vouchers.service.test.ts
```

Expected: FAIL — "Cannot find module './vouchers.service'"

---

## Task 3: Voucher Service

**Files:**
- Create: `apps/server/src/modules/vouchers/vouchers.service.ts`

- [ ] **Step 1: Create vouchers.service.ts with helper functions**

```typescript
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
  let service: { id: string; name: string; description: string | null } | null = null;
  if (data.type === 'SERVICE') {
    if (!data.serviceId) throw new AppError('Wybierz usługę', 400);
    service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      select: { id: true, name: true, description: true, isActive: true },
    }) as any;
    if (!service || !(service as any).isActive) throw new AppError('Usługa nie istnieje lub jest nieaktywna', 400);
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

    // Use cuid from Prisma's @default(cuid()) by letting Prisma generate it,
    // but we need the ID before Phase 2. Use prisma's create and capture id.
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
    const pdfBuffer = await generateVoucherPdf(voucher);
    const pdfPath = `vouchers/${voucher.id}.pdf`;
    await fs.writeFile(path.join(process.cwd(), 'uploads', pdfPath), pdfBuffer);
    await prisma.voucher.update({ where: { id: voucher.id }, data: { pdfPath } });
    return { ...voucher, pdfPath };
  } catch (err) {
    console.error('[vouchers] PDF generation failed:', err);
    return voucher; // still return voucher — PDF can be regenerated on GET
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
```

- [ ] **Step 2: Run tests — generateVoucherCode tests should now pass**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/vouchers/vouchers.service.test.ts
```

Expected: PASS (2 tests for generateVoucherCode, 1 for buildVoucherCode).

- [ ] **Step 3: Add deleteVoucher logic tests**

Replace the entire `vouchers.service.test.ts` with this (vi.mock MUST be at top level — vitest hoists it):

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
cd cosmo-app/apps/server
pnpm vitest run src/modules/vouchers/vouchers.service.test.ts
```

Expected: PASS (all tests including deleteVoucher).

---

## Task 4: PDF Generator

**Files:**
- Create: `apps/server/src/modules/vouchers/vouchers.pdf.ts`

No unit tests for visual PDF output — verified manually after integration.

- [ ] **Step 1: Create vouchers.pdf.ts**

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Brand colors (matches site Tailwind palette)
const IVORY = rgb(0.957, 0.976, 0.961);      // #F4F9F5
const FOREST = rgb(0.165, 0.361, 0.314);      // #2A5C3E
const OAK = rgb(0.769, 0.588, 0.353);         // #C4965A
const ESPRESSO = rgb(0.102, 0.220, 0.157);    // #1A3828
const MUTED = rgb(0.353, 0.478, 0.384);       // #5A7A62
const CREAM = rgb(0.910, 0.953, 0.918);       // #E8F3EA

type VoucherData = {
  id: string;
  type: 'SERVICE' | 'CASH';
  code: string;
  recipientName?: string | null;
  senderName?: string | null;
  message?: string | null;
  validUntil: Date;
  amount?: any;
  service?: { name: string; description?: string | null } | null;
};

export async function generateVoucherPdf(voucher: VoucherData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // A5 landscape: 595 x 420 pt
  const page = pdfDoc.addPage([595, 420]);
  const { width, height } = page.getSize();

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const leftW = Math.floor(width * 0.62);  // ~369 pt
  const rightX = leftW;

  // ── LEFT PANEL: Ivory background ──
  page.drawRectangle({ x: 0, y: 0, width: leftW, height, color: IVORY });

  // Subtle decorative circle (top-left)
  page.drawCircle({ x: -20, y: height + 20, size: 90, color: CREAM });

  const pad = 28;

  // Logo / brand
  page.drawText('✦ BESKIDSTUDIO', {
    x: pad, y: height - 38,
    size: 9, font: helveticaBold, color: rgb(0.239, 0.478, 0.329), // #3D7A54
    characterSpacing: 2,
  });
  page.drawText('Gabinet Kosmetologii Estetycznej', {
    x: pad, y: height - 52,
    size: 7, font: helvetica, color: MUTED,
  });

  // Separator
  page.drawLine({
    start: { x: pad, y: height - 62 },
    end: { x: leftW - pad, y: height - 62 },
    thickness: 0.5, color: rgb(0.8, 0.9, 0.83),
  });

  // "VOUCHER PREZENTOWY" label
  page.drawText('VOUCHER PREZENTOWY', {
    x: pad, y: height - 82,
    size: 7.5, font: helveticaBold, color: OAK, characterSpacing: 2,
  });

  // Recipient / sender line
  const toFrom = [
    voucher.recipientName ? `Dla: ${voucher.recipientName}` : null,
    voucher.senderName ? `Od: ${voucher.senderName}` : null,
  ].filter(Boolean).join('  ·  ');

  if (toFrom) {
    page.drawText(toFrom, {
      x: pad, y: height - 96,
      size: 8, font: helvetica, color: OAK,
    });
  }

  // Main content: service name or amount
  const mainY = toFrom ? height - 140 : height - 130;

  if (voucher.type === 'SERVICE' && voucher.service) {
    const name = voucher.service.name;
    // Large service name — split if too long
    const words = name.split(' ');
    let line1 = '', line2 = '';
    for (const w of words) {
      if (helveticaBold.widthOfTextAtSize(`${line1} ${w}`.trim(), 24) < leftW - pad * 2) {
        line1 = `${line1} ${w}`.trim();
      } else {
        line2 = `${line2} ${w}`.trim();
      }
    }
    page.drawText(line1, { x: pad, y: mainY, size: 24, font: helveticaBold, color: ESPRESSO });
    if (line2) page.drawText(line2, { x: pad, y: mainY - 28, size: 24, font: helveticaBold, color: ESPRESSO });

    const gratisY = line2 ? mainY - 56 : mainY - 34;
    page.drawText('GRATIS', { x: pad, y: gratisY, size: 13, font: helveticaBold, color: rgb(0.239, 0.478, 0.329), characterSpacing: 3 });
  } else {
    const amountStr = `${Number(voucher.amount).toFixed(0)} zł`;
    page.drawText(amountStr, { x: pad, y: mainY, size: 36, font: helveticaBold, color: ESPRESSO });
    page.drawText('VOUCHER GOTÓWKOWY', { x: pad, y: mainY - 30, size: 9, font: helveticaBold, color: MUTED, characterSpacing: 1.5 });
  }

  // Message (italic, truncated)
  if (voucher.message) {
    const msg = voucher.message.length > 80 ? voucher.message.slice(0, 77) + '...' : voucher.message;
    page.drawText(`"${msg}"`, {
      x: pad, y: 118,
      size: 8, font: helveticaOblique, color: MUTED,
    });
  }

  // Bottom: code label + code box
  page.drawText('KOD REALIZACJI', { x: pad, y: 88, size: 6.5, font: helveticaBold, color: MUTED, characterSpacing: 1.5 });

  // Code box
  const codeBoxX = pad;
  const codeBoxY = 60;
  const codeBoxW = 170;
  const codeBoxH = 22;
  page.drawRectangle({ x: codeBoxX, y: codeBoxY, width: codeBoxW, height: codeBoxH, color: CREAM });
  page.drawRectangle({ x: codeBoxX, y: codeBoxY, width: codeBoxW, height: codeBoxH, borderColor: rgb(0.7, 0.85, 0.73), borderWidth: 0.5 });
  page.drawText(voucher.code, {
    x: codeBoxX + 8, y: codeBoxY + 7,
    size: 10, font: helveticaBold, color: ESPRESSO, characterSpacing: 2,
  });

  // Valid until
  const dateStr = voucher.validUntil.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  page.drawText(`Ważny do: ${dateStr}`, { x: pad, y: 46, size: 7, font: helvetica, color: MUTED });

  // ── RIGHT PANEL: Deep Forest Green ──
  page.drawRectangle({ x: rightX, y: 0, width: width - rightX, height, color: FOREST });

  // Subtle diagonal texture (thin lines)
  for (let i = -height; i < width; i += 18) {
    page.drawLine({
      start: { x: rightX + Math.max(0, i), y: i < 0 ? 0 : height },
      end: { x: rightX + Math.min(width - rightX, i + height), y: i < 0 ? -(i) : 0 },
      thickness: 0.4, color: rgb(0.196, 0.416, 0.275), // slightly lighter than FOREST
      opacity: 0.4,
    });
  }

  // Center content
  const cx = rightX + (width - rightX) / 2;
  const cy = height / 2;

  // Oak ornament
  page.drawText('✦', { x: cx - 8, y: cy + 50, size: 18, font: helveticaBold, color: OAK });

  // Vertical line
  page.drawLine({ start: { x: cx, y: cy + 36 }, end: { x: cx, y: cy - 10 }, thickness: 0.7, color: rgb(0.6, 0.45, 0.28), opacity: 0.5 });

  // Labels
  page.drawText('PIELĘGNACJA', { x: cx - 36, y: cy - 20, size: 7, font: helveticaBold, color: rgb(0.96, 0.976, 0.961), characterSpacing: 1.5, opacity: 0.55 });
  page.drawText('& RELAKS', { x: cx - 25, y: cy - 32, size: 7, font: helveticaBold, color: rgb(0.96, 0.976, 0.961), characterSpacing: 1.5, opacity: 0.55 });

  // Vertical line
  page.drawLine({ start: { x: cx, y: cy - 44 }, end: { x: cx, y: cy - 80 }, thickness: 0.7, color: rgb(0.6, 0.45, 0.28), opacity: 0.5 });

  // Website URL
  page.drawText('kosmetologwiktoriacwik.pl', { x: cx - 65, y: cy - 94, size: 6, font: helvetica, color: IVORY, opacity: 0.35 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server
pnpm build 2>&1 | head -30
```

Expected: build succeeds (or only pre-existing warnings, no new errors from vouchers.pdf.ts).

---

## Task 5: Router, Controller, Register in app.ts

**Files:**
- Create: `apps/server/src/modules/vouchers/vouchers.controller.ts`
- Create: `apps/server/src/modules/vouchers/vouchers.router.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create controller**

```typescript
// apps/server/src/modules/vouchers/vouchers.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from './vouchers.service';
import path from 'path';
import { z } from 'zod';

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
  { message: 'serviceId jest wymagane dla vouchera na usługę', path: ['serviceId'] }
).refine(
  (d) => d.type !== 'CASH' || (!!d.amount && d.amount >= 1),
  { message: 'amount jest wymagane dla vouchera gotówkowego', path: ['amount'] }
);

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const adminId = (req as any).user.id;
    const voucher = await service.createVoucher(data, adminId);
    res.status(201).json(voucher);
  } catch (err) { next(err); }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.listVouchers(page, limit);
    res.json(result);
  } catch (err) { next(err); }
};

export const getPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = await service.getVoucherPdfPath(req.params.id);
    const voucher = await import('../../config/prisma').then(m =>
      m.default.voucher.findUnique({ where: { id: req.params.id } })
    );
    res.setHeader('Content-Disposition', `attachment; filename="voucher-${voucher?.code ?? req.params.id}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(path.resolve(filePath));
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteVoucher(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Create router**

```typescript
// apps/server/src/modules/vouchers/vouchers.router.ts
import { Router } from 'express';
import * as controller from './vouchers.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();
router.use(authenticate, requireAdmin);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id/pdf', controller.getPdf);
router.delete('/:id', controller.remove);

export default router;
```

- [ ] **Step 3: Register in app.ts**

In `apps/server/src/app.ts`, add import after line 33 (last import):
```typescript
import vouchersRouter from './modules/vouchers/vouchers.router';
```

And register after `notificationsRouter` (line ~91):
```typescript
app.use('/api/vouchers', vouchersRouter);
```

- [ ] **Step 4: Build and verify no TypeScript errors**

```bash
cd cosmo-app/apps/server
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no new errors.

- [ ] **Step 5: Run all server tests**

```bash
cd cosmo-app/apps/server
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit backend**

```bash
cd cosmo-app
git add apps/server/prisma/schema.prisma apps/server/src/modules/vouchers/ apps/server/src/app.ts apps/server/src/modules/discount-codes/discount-codes.service.ts
git commit -m "feat: add voucher generator backend module with PDF generation"
```

---

## Task 6: Frontend API

**Files:**
- Create: `apps/web/src/api/vouchers.api.ts`

- [ ] **Step 1: Create vouchers.api.ts**

```typescript
// apps/web/src/api/vouchers.api.ts
import api from '@/lib/axios';

export type VoucherType = 'SERVICE' | 'CASH';

export type CreateVoucherPayload = {
  type: VoucherType;
  serviceId?: string;
  amount?: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
  validUntil?: string;
};

export type Voucher = {
  id: string;
  type: VoucherType;
  code: string;
  recipientName: string | null;
  senderName: string | null;
  message: string | null;
  validUntil: string;
  amount: string | null;
  pdfPath: string | null;
  createdAt: string;
  service: { name: string } | null;
};

export const vouchersApi = {
  create: async (payload: CreateVoucherPayload): Promise<Voucher> => {
    const res = await api.post('/vouchers', payload);
    return res.data;
  },

  list: async (page = 1, limit = 20): Promise<{ data: Voucher[]; totalPages: number; total: number }> => {
    const res = await api.get('/vouchers', { params: { page, limit } });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vouchers/${id}`);
  },

  getPdfUrl: (id: string): string => `/api/vouchers/${id}/pdf`,
};
```

---

## Task 7: VoucherPreview Component

**Files:**
- Create: `apps/web/src/components/voucher/VoucherPreview.tsx`

- [ ] **Step 1: Create VoucherPreview.tsx**

This is a styled HTML component that approximates the PDF design (Ivory + Forest Green).

```tsx
// apps/web/src/components/voucher/VoucherPreview.tsx
import React from 'react';

type Props = {
  type: 'SERVICE' | 'CASH';
  serviceName?: string;
  amount?: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
  validUntil?: string;
  code?: string;
};

export const VoucherPreview: React.FC<Props> = ({
  type,
  serviceName,
  amount,
  recipientName,
  senderName,
  message,
  validUntil,
  code = 'VCH-????-????',
}) => {
  const toFrom = [
    recipientName ? `Dla: ${recipientName}` : null,
    senderName ? `Od: ${senderName}` : null,
  ].filter(Boolean).join('  ·  ');

  const dateStr = validUntil
    ? new Date(validUntil).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div
      className="w-full overflow-hidden rounded-lg shadow-xl"
      style={{ aspectRatio: '210/148', display: 'flex', fontSize: '12px' }}
    >
      {/* Left panel — Ivory */}
      <div
        className="flex flex-col justify-between"
        style={{
          width: '62%',
          background: '#F4F9F5',
          padding: '7% 7% 6%',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-8%',
          width: '35%', height: 0, paddingBottom: '35%',
          borderRadius: '50%', background: '#E8F3EA',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.6em', fontWeight: 700, letterSpacing: '0.18em', color: '#3D7A54', textTransform: 'uppercase' }}>
            ✦ BeskidStudio
          </div>
          <div style={{ fontSize: '0.5em', color: '#5A7A62', letterSpacing: '0.05em', marginTop: '1px' }}>
            Gabinet Kosmetologii Estetycznej
          </div>
          <hr style={{ border: 'none', borderTop: '0.5px solid #C8E0CC', margin: '5% 0 4%' }} />
          <div style={{ fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.18em', color: '#C4965A', textTransform: 'uppercase' }}>
            Voucher Prezentowy
          </div>
          {toFrom && (
            <div style={{ fontSize: '0.5em', color: '#C4965A', marginTop: '1px' }}>{toFrom}</div>
          )}
        </div>

        <div>
          {type === 'SERVICE' ? (
            <>
              <div style={{ fontSize: '1.1em', fontWeight: 700, color: '#1A3828', lineHeight: 1.2 }}>
                {serviceName || <span style={{ color: '#aaa' }}>— wybierz usługę —</span>}
              </div>
              <div style={{ fontSize: '0.65em', fontWeight: 700, color: '#3D7A54', letterSpacing: '0.2em', marginTop: '2px' }}>
                GRATIS
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.5em', fontWeight: 700, color: '#1A3828' }}>
                {amount ? `${amount} zł` : <span style={{ color: '#aaa' }}>— kwota —</span>}
              </div>
              <div style={{ fontSize: '0.55em', color: '#5A7A62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Voucher Gotówkowy
              </div>
            </>
          )}
          {message && (
            <div style={{ fontSize: '0.5em', color: '#5A7A62', fontStyle: 'italic', marginTop: '3px' }}>
              "{message.slice(0, 60)}{message.length > 60 ? '…' : ''}"
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.48em', fontWeight: 700, letterSpacing: '0.15em', color: '#5A7A62', textTransform: 'uppercase', marginBottom: '2px' }}>
            Kod realizacji
          </div>
          <div style={{
            display: 'inline-block',
            background: '#E8F3EA',
            border: '0.5px solid #B5D8BB',
            borderRadius: '3px',
            padding: '2px 6px',
            fontFamily: 'monospace',
            fontSize: '0.65em',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#1A3828',
          }}>
            {code}
          </div>
          <div style={{ fontSize: '0.45em', color: '#5A7A62', marginTop: '2px' }}>
            Ważny do: {dateStr}
          </div>
        </div>
      </div>

      {/* Right panel — Forest Green */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: '38%',
          background: '#2A5C3E',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, rgba(196,150,90,0.03) 0, rgba(196,150,90,0.03) 1px, transparent 0, transparent 50%)',
          backgroundSize: '14px 14px',
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 12%' }}>
          <div style={{ fontSize: '1.2em', color: '#C4965A', marginBottom: '6px' }}>✦</div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(196,150,90,0.3)', margin: '0 auto 6px' }} />
          <div style={{ fontSize: '0.45em', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,249,245,0.5)', lineHeight: 1.9 }}>
            Pielęgnacja<br />& Relaks
          </div>
          <div style={{ width: '1px', height: '16px', background: 'rgba(196,150,90,0.3)', margin: '6px auto' }} />
          <div style={{ fontSize: '0.38em', color: 'rgba(244,249,245,0.3)', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
            kosmetologwiktoriacwik.pl
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Task 8: AdminVouchery Page

**Files:**
- Create: `apps/web/src/pages/admin/AdminVouchery.tsx`

- [ ] **Step 1: Create AdminVouchery.tsx**

```tsx
// apps/web/src/pages/admin/AdminVouchery.tsx
import { useState, useEffect } from 'react';
import { vouchersApi, Voucher, CreateVoucherPayload } from '@/api/vouchers.api';
import { VoucherPreview } from '@/components/voucher/VoucherPreview';

type Service = { id: string; name: string };

// Date 12 months from now formatted as YYYY-MM-DD for input[type=date]
const defaultValidUntil = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export function AdminVouchery() {
  const [tab, setTab] = useState<'generator' | 'historia'>('generator');

  // Generator state
  const [type, setType] = useState<'SERVICE' | 'CASH'>('SERVICE');
  const [serviceId, setServiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [services, setServices] = useState<Service[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Historia state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load services for dropdown
  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(d => setServices(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {});
  }, []);

  // Load vouchers when Historia tab shown
  useEffect(() => {
    if (tab === 'historia') loadVouchers();
  }, [tab, page]);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const res = await vouchersApi.list(page);
      setVouchers(res.data);
      setTotalPages(res.totalPages);
    } catch { setVouchers([]); }
    finally { setLoading(false); }
  };

  const selectedService = services.find(s => s.id === serviceId);

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const payload: CreateVoucherPayload = {
        type,
        serviceId: type === 'SERVICE' ? serviceId : undefined,
        amount: type === 'CASH' ? Number(amount) : undefined,
        recipientName: recipientName || undefined,
        senderName: senderName || undefined,
        message: message || undefined,
        validUntil: new Date(validUntil).toISOString(),
      };
      const voucher = await vouchersApi.create(payload);
      // Trigger PDF download
      window.open(vouchersApi.getPdfUrl(voucher.id), '_blank');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Błąd generowania vouchera');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vouchersApi.delete(id);
      setDeleteConfirm(null);
      loadVouchers();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Nie można usunąć vouchera');
    }
  };

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caramel/40';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-1">Vouchery Prezentowe</h1>
      <p className="text-sm text-muted-foreground mb-6">Generuj vouchery na usługi lub gotówkowe w formacie PDF A5</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(['generator', 'historia'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-caramel text-caramel'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'generator' ? '🎁 Generator' : `📋 Historia`}
          </button>
        ))}
      </div>

      {/* GENERATOR TAB */}
      {tab === 'generator' && (
        <div className="flex gap-8">
          {/* Form */}
          <div className="flex-1 space-y-4">
            {/* Type */}
            <div>
              <label className={labelCls}>Typ vouchera</label>
              <div className="flex gap-2">
                {(['SERVICE', 'CASH'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      type === t
                        ? 'border-caramel bg-caramel/10 text-caramel'
                        : 'border-border text-muted-foreground hover:border-caramel/50'
                    }`}
                  >
                    {t === 'SERVICE' ? '✦ Na usługę (100% rabat)' : '💵 Gotówkowy'}
                  </button>
                ))}
              </div>
            </div>

            {/* Service or Amount */}
            {type === 'SERVICE' ? (
              <div>
                <label className={labelCls}>Usługa *</label>
                <select className={inputCls} value={serviceId} onChange={e => setServiceId(e.target.value)}>
                  <option value="">— wybierz usługę —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Kwota (zł) *</label>
                <input
                  type="number" min={1} max={9999} step={1}
                  className={inputCls}
                  placeholder="np. 200"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            )}

            <hr className="border-border" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Dla kogo (opcjonalnie)</label>
                <input className={inputCls} maxLength={80} placeholder="Ania" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Od kogo (opcjonalnie)</label>
                <input className={inputCls} maxLength={80} placeholder="Mama" value={senderName} onChange={e => setSenderName(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Wiadomość (opcjonalnie)</label>
              <textarea
                className={inputCls}
                rows={2}
                maxLength={120}
                placeholder="Z okazji urodzin!"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right mt-0.5">{message.length}/120</p>
            </div>

            <div>
              <label className={labelCls}>Ważny do</label>
              <input type="date" className={inputCls} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={generating || (type === 'SERVICE' && !serviceId) || (type === 'CASH' && !amount)}
              className="w-full py-2.5 rounded-md bg-caramel text-white text-sm font-semibold uppercase tracking-wider hover:bg-walnut transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generowanie...' : '⬇ Generuj PDF i pobierz'}
            </button>
          </div>

          {/* Live Preview */}
          <div className="w-80 flex-shrink-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Podgląd</p>
            <VoucherPreview
              type={type}
              serviceName={selectedService?.name}
              amount={amount ? Number(amount) : undefined}
              recipientName={recipientName || undefined}
              senderName={senderName || undefined}
              message={message || undefined}
              validUntil={validUntil}
            />
          </div>
        </div>
      )}

      {/* HISTORIA TAB */}
      {tab === 'historia' && (
        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wygenerowanych voucherów.</p>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {['Typ', 'Usługa / Kwota', 'Dla', 'Kod', 'Wystawiony', 'Ważny do', 'Akcje'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          v.type === 'SERVICE' ? 'bg-caramel/15 text-caramel' : 'bg-oak/15 text-oak'
                        }`}>
                          {v.type === 'SERVICE' ? 'Usługa' : 'Gotówk.'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-foreground">
                        {v.service?.name ?? (v.amount ? `${Number(v.amount).toFixed(0)} zł` : '—')}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {[v.recipientName, v.senderName ? `od: ${v.senderName}` : null].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-caramel">{v.code}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(v.validUntil).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <a
                            href={vouchersApi.getPdfUrl(v.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent text-foreground"
                          >
                            ⬇ PDF
                          </a>
                          {deleteConfirm === v.id ? (
                            <>
                              <button onClick={() => handleDelete(v.id)} className="text-xs px-2 py-1 rounded bg-destructive text-white">Tak, usuń</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded border border-border">Anuluj</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(v.id)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive">✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex gap-2 mt-4 justify-center">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-40">←</button>
                  <span className="px-3 py-1 text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-40">→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Task 9: Navigation — Router + AdminLayout

**Files:**
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Add route in router.tsx**

Find the admin routes section (around `{ path: 'kody-rabatowe', ... }`). Add after it:

```tsx
{ path: 'vouchery', element: <S><AdminVouchery /></S> },
```

Also add the lazy import at the top of router.tsx (use named-export pattern consistent with other admin pages):
```tsx
const AdminVouchery = lazy(() => import('./pages/admin/AdminVouchery').then(m => ({ default: m.AdminVouchery })));
```

And change `AdminVouchery.tsx` to use a **named export** (not default):
```tsx
// Replace: export function AdminVouchery() {
// With:
export function AdminVouchery() {
```

- [ ] **Step 2: Add link in AdminLayout desktop nav (line ~153)**

After `{ to: '/admin/kody-rabatowe', label: 'Kody' }`, add:
```tsx
{ to: '/admin/vouchery', label: 'Vouchery' },
```

- [ ] **Step 3: Add link in AdminLayout mobile Sprzedaż section + fix accordion initializer**

After the Kody Rabatowe `<Link>` (line ~427), add:
```tsx
<Link to="/admin/vouchery" className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
  Vouchery
</Link>
```

Also update the `sprzedazOpen` initializer (line ~40) to include `/admin/vouchery` so the accordion opens automatically when on the Vouchery page:
```tsx
// Before:
() => ['/admin/kody-rabatowe', '/admin/lojalnosc', '/admin/asortyment'].some(p => location.pathname.startsWith(p))
// After:
() => ['/admin/kody-rabatowe', '/admin/lojalnosc', '/admin/asortyment', '/admin/vouchery'].some(p => location.pathname.startsWith(p))
```

- [ ] **Step 4: Start dev server and verify**

```bash
cd cosmo-app
pnpm dev
```

Open `http://localhost:5173/admin/vouchery` — verify:
- Page loads without errors
- "Vouchery" appears in admin sidebar
- Generator tab shows form + live preview
- Switching to SERVICE/CASH changes form fields

- [ ] **Step 5: End-to-end manual test**

1. Select service voucher → pick a service → click "Generuj PDF i pobierz"
2. Verify PDF opens in browser (or downloads) with ivory+green design
3. Go to Historia tab — voucher appears in list
4. Click "⬇ PDF" on history row — same PDF opens
5. Create cash voucher (200 zł) — verify PDF shows "200 zł" not service name
6. Try to delete — confirm dialog appears; confirm → voucher removed from list

- [ ] **Step 6: Commit frontend**

```bash
cd cosmo-app
git add apps/web/src/api/vouchers.api.ts apps/web/src/components/voucher/ apps/web/src/pages/admin/AdminVouchery.tsx apps/web/src/router.tsx apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat: add voucher generator admin page with live preview and PDF download"
```

---

## Task 10: Build and Production Verify

- [ ] **Step 1: Full build**

```bash
cd cosmo-app
pnpm build
```

Expected: both web and server build without errors.

- [ ] **Step 2: Run server tests one final time**

```bash
cd cosmo-app/apps/server
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Final commit**

```bash
cd cosmo-app
git add .
git commit -m "feat: voucher generator — A5 PDF, ivory+green design, service and cash types"
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cd cosmo-app/apps/server && pnpm prisma:migrate` | Run DB migration |
| `cd cosmo-app/apps/server && pnpm test` | Run all server tests |
| `cd cosmo-app/apps/server && pnpm vitest run src/modules/vouchers/vouchers.service.test.ts` | Run voucher tests only |
| `cd cosmo-app && pnpm dev` | Start full dev stack |
| `cd cosmo-app && pnpm build` | Production build |
