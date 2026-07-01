# Voucher Generator — Design Spec
**Date:** 2026-06-27
**Project:** COSMO / BeskidStudio (kosmetologwiktoriacwik.pl)
**Status:** Approved

---

## Overview

Add a voucher generator to the admin panel at `/admin/vouchery`. Admins can generate two types of gift vouchers — service-based (100% discount code) and cash-based (manual handling) — each producing a styled PDF in the site's brand colors.

---

## Voucher Types

### 1. Service Voucher (`VoucherType.SERVICE`)
- Admin selects a service (must be active: `isActive=true`)
- System generates a unique voucher code (`VCH-XXXX-XXXX`) with up to 5 retry attempts on collision
- System creates a linked `DiscountCode` with `discountType=PERCENTAGE`, `discountValue=100`, `isMultiUse=false`, `expiresAt=validUntil`
- Client can redeem the code during online booking; expiry is enforced via `DiscountCode.expiresAt`
- PDF generated and stored on server

### 2. Cash Voucher (`VoucherType.CASH`)
- Admin enters a PLN amount (min 1, max 9999)
- No discount code created — admin handles redemption manually
- PDF generated and stored on server

---

## Data Model

### New Prisma model

```prisma
model Voucher {
  id             String       @id @default(cuid())
  type           VoucherType
  recipientName  String?
  senderName     String?
  message        String?      // max 120 chars, validated on backend
  serviceId      String?
  service        Service?     @relation("VoucherService", fields: [serviceId], references: [id])
  amount         Decimal?     @db.Decimal(10,2)  // PLN, only for CASH type; min 1, max 9999
  discountCodeId String?      @unique
  discountCode   DiscountCode? @relation("VoucherDiscountCode", fields: [discountCodeId], references: [id])
  code           String       @unique  // e.g. VCH-X7K2-9PQ1
  validUntil     DateTime     // default: now + 12 months
  pdfPath        String?      // relative path under /uploads/vouchers/
  createdAt      DateTime     @default(now())
  createdById    String?
  createdBy      User?        @relation("VoucherCreatedBy", fields: [createdById], references: [id])
}

enum VoucherType {
  SERVICE
  CASH
}
```

### Relations to add on existing models
- `Service` — add `vouchers Voucher[] @relation("VoucherService")`
- `DiscountCode` — add `voucher Voucher? @relation("VoucherDiscountCode")`; add `expiresAt DateTime?` field (nullable, backward-compatible migration)
- `User` — add `createdVouchers Voucher[] @relation("VoucherCreatedBy")`

### DiscountCode schema addition
```prisma
// Add to existing DiscountCode model:
expiresAt  DateTime?
voucher    Voucher?  @relation("VoucherDiscountCode")
```
The `validateCode` service function must be updated to reject codes where `expiresAt` is set and `expiresAt < now()`.

---

## Backend — Module `vouchers`

**Files:** `apps/server/src/modules/vouchers/`
- `vouchers.router.ts`
- `vouchers.controller.ts`
- `vouchers.service.ts`
- `vouchers.pdf.ts` — PDF generation logic (pdf-lib)

**Endpoints (all require `authenticate` + `requireAdmin`):**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/vouchers` | Create voucher + PDF, return download URL |
| `GET` | `/api/vouchers` | List all vouchers (paginated, newest first) |
| `GET` | `/api/vouchers/:id/pdf` | Stream PDF; returns 404 if pdfPath null or file missing |
| `DELETE` | `/api/vouchers/:id` | Delete voucher (see deletion rules below) |

**`POST /api/vouchers` request body (Zod schema):**
```ts
z.object({
  type: z.enum(['SERVICE', 'CASH']),
  serviceId: z.string().optional(),   // required + must exist + isActive=true if type=SERVICE
  amount: z.number().min(1).max(9999).multipleOf(0.01).optional(), // required if type=CASH; service rounds to 2 decimal places before DB write
  recipientName: z.string().max(80).optional(),
  senderName: z.string().max(80).optional(),
  message: z.string().max(120).optional(),
  validUntil: z.string().datetime().optional(), // defaults to now+12months
})
// Refinements:
// - if type=SERVICE, serviceId must be present
// - if type=CASH, amount must be present
```

**Service voucher creation flow (two-phase, not a single transaction):**

Phase 1 — DB transaction (atomic):
1. Validate service exists and `isActive=true` (throw 400 if not)
2. Generate unique code `VCH-XXXX-XXXX`; retry up to 5 times on unique constraint violation; throw 500 if all attempts fail
3. Pre-generate voucher `id` using `cuid()` (import from `@paralleldrive/cuid2` or use `createId()`) so PDF filename is known before disk write
4. Create `DiscountCode` (PERCENTAGE, 100%, single-use, `expiresAt=validUntil`)
5. Create `Voucher` with the pre-generated `id`, linked to DiscountCode; `pdfPath` is null at this point

Phase 2 — PDF generation (outside transaction):
6. Generate PDF → save to `uploads/vouchers/{voucherId}.pdf`
7. `prisma.voucher.update({ where: { id }, data: { pdfPath } })` — separate non-transactional write
8. If PDF generation throws, log the error but still return the voucher (PDF can be regenerated via GET /:id/pdf)

**Cash voucher creation flow:**
Same two-phase approach, but without DiscountCode creation (steps 4 is skipped). A `VCH-XXXX-XXXX` code IS still generated and stored on the Voucher — it appears on the PDF and lets the admin identify/reference the physical voucher. The retry loop (step 2) applies equally to CASH vouchers.

**`DELETE /api/vouchers/:id` rules:**
- If type=SERVICE and linked DiscountCode has any `DiscountCodeUsage` records → return 400 ("Voucher został już wykorzystany — nie można usunąć")
- If type=SERVICE and no usages → hard-delete both `Voucher` and `DiscountCode`
- If type=CASH → hard-delete `Voucher`
- Delete PDF file from disk (ignore ENOENT)

**`GET /api/vouchers/:id/pdf`:**
- If `voucher.pdfPath` is null or file does not exist on disk → regenerate PDF on the fly and stream it (do not require a separate "regenerate" endpoint)
- Set `Content-Disposition: attachment; filename="voucher-{code}.pdf"`

---

## PDF Design

**Format:** A5 landscape (595 × 420 pt at 72 dpi)
**Style:** Variant B — Ivory left panel + Forest Green right panel
**Library:** `pdf-lib` (already installed on server)
**Font:** Helvetica (built into pdf-lib — no external font download needed)

### Layout

**Left panel (62% = ~369 pt wide) — background `#F4F9F5`:**
- Top: "✦ BESKIDSTUDIO" in forest green `#3D7A54`, small caps, letter-spacing
- Below logo: "Gabinet Kosmetologii Estetycznej" in muted green `#5A7A62`, tiny
- Separator line
- "VOUCHER PREZENTOWY" label in oak `#C4965A`
- If recipientName or senderName: "Dla: {name} · Od: {name}" line in oak
- Service name (large, `#1A3828`) or PLN amount ("200 zł") for CASH
- "GRATIS" (SERVICE) or empty (CASH) in forest green bold
- If message: italic quote in muted green
- Bottom: "KOD" label, monospace code in a light-green box `#E8F3EA`; "Ważny do: {date}"

**Right panel (38% = ~226 pt wide) — background `#2A5C3E`:**
- Centered vertically: "✦" in oak `#C4965A`, vertical decorative line, "PIELĘGNACJA & RELAKS" tiny ivory caps, website URL in faded ivory
- No other content

**Cash voucher difference:** Instead of service name + "GRATIS", show amount in large bold (e.g., "200 zł") and "Voucher Gotówkowy" label.

**PDF stored at:** `uploads/vouchers/{voucherId}.pdf`
**Served via:** existing static `/uploads` route in Express

---

## Frontend — `/admin/vouchery`

**New file:** `apps/web/src/pages/admin/AdminVouchery.tsx`
**New API file:** `apps/web/src/api/vouchers.api.ts`

### Route addition in `router.tsx`
```tsx
{ path: 'vouchery', element: <S><AdminVouchery /></S> }
```

### Sidebar addition in `AdminLayout.tsx`
Add link "🎁 Vouchery" → `/admin/vouchery` between "Kody rabatowe" and the next item.

### Page Structure — Two tabs

**Tab 1: Generator**
- Type selector: radio/toggle "Na usługę (100%)" / "Gotówkowy"
- If SERVICE: `<select>` dropdown populated from `GET /api/services` (show only active services)
- If CASH: number input, min=1, max=9999, step=1, suffix "zł"
- Optional fields: Recipient name (max 80), Sender name (max 80), Message textarea (max 120, char counter)
- Validity date picker defaulting to today + 12 months
- Live HTML preview (styled div matching PDF proportions, updates as form changes)
- "Generuj PDF i pobierz" button → `POST /api/vouchers` → response contains `id` → immediately trigger `GET /api/vouchers/:id/pdf` as browser download
- Button shows loading state during generation

**Tab 2: Historia**
- `GET /api/vouchers?page=1&limit=20`
- Table: Typ (badge SERVICE/CASH), Usługa / Kwota, Dla, Kod (monospace), Wystawiony, Ważny do, Akcje
- Actions: "⬇ PDF" → opens `/api/vouchers/:id/pdf` in new tab; "✕" → confirm dialog → DELETE
- Empty state if no vouchers yet

---

## Validation Summary

| Field | Frontend | Backend (Zod) |
|-------|----------|---------------|
| type | required, radio | z.enum(['SERVICE','CASH']) |
| serviceId | required if SERVICE | required + DB check active |
| amount | required if CASH, 1–9999 | z.number().min(1).max(9999).multipleOf(0.01) |
| recipientName | max 80 chars | z.string().max(80).optional() |
| senderName | max 80 chars | z.string().max(80).optional() |
| message | max 120, char counter | z.string().max(120).optional() |
| validUntil | date picker | z.string().datetime().optional() |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate page `/admin/vouchery` | Cleaner UX; vouchers are a distinct concept from generic discount codes |
| Two-phase creation (DB then PDF) | Avoids mixing I/O side effects inside DB transaction; voucher is always recoverable |
| Pre-generate cuid | Enables PDF filename to be known before disk write; avoids second DB read |
| Add `expiresAt` to DiscountCode | Enforces voucher validity at booking time; backward-compatible (nullable) |
| `Decimal(10,2)` for amount | Consistent with all existing monetary fields in schema |
| Retry loop (5 attempts) for code | Handles VCH code collisions; fails fast with 500 if all fail |
| Block DELETE (400) if discount code used | Preserves audit trail of DiscountCodeUsage records; admin must deactivate manually via Kody Rabatowe if needed |
| PDF regenerated on-demand if missing | Resilient to accidental file deletion |
| Helvetica (built-in) | No external font dependency; pdf-lib bundles it |

---

## Out of Scope

- Email delivery of PDF (admin downloads and sends manually)
- Redemption tracking for cash vouchers (admin handles manually)
- Expiry enforcement for cash vouchers (admin handles manually)
- Public-facing voucher purchase form
