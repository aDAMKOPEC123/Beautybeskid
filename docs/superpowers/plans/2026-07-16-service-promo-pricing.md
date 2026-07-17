# Service Promo Pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin to set promotional discounts on services (percentage or fixed amount) with start/end dates, visible on public pages and booking wizard.

**Architecture:** 4 nullable fields added to Service model. Backend computes `promoPrice` on read. Frontend shows strikethrough original + promo price with badge. Admin manages via existing service form.

**Tech Stack:** Prisma + PostgreSQL (migration), Express (service layer), React 19 + TypeScript (UI), Zod (validation)

**Spec:** `docs/superpowers/specs/2026-07-16-service-promo-pricing-design.md`

---

### Task 1: Database Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma` (Service model, ~line 332)

- [ ] **Step 1: Add promo fields to Service model**

In `schema.prisma`, add after the `seasons` field (around line 345):

```prisma
  promoDiscountType  DiscountType?
  promoDiscountValue Decimal?      @db.Decimal(10, 2)
  promoStartDate     DateTime?
  promoEndDate       DateTime?
```

The `DiscountType` enum already exists (line ~43) with `PERCENTAGE | AMOUNT | OTHER`.

- [ ] **Step 2: Generate and run migration**

```bash
cd cosmo-app/apps/server
npx prisma migrate dev --name add-service-promo-pricing
```

Expected: Migration creates 4 nullable columns. All existing services get null values.

- [ ] **Step 3: Verify Prisma client generation**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add promo pricing fields to Service model"
```

---

### Task 2: Shared Schema Update

**Files:**
- Modify: `packages/shared/src/schemas/service.schema.ts` (~line 5-22, serviceSchemaBase)

- [ ] **Step 1: Add promo fields to serviceSchemaBase**

Add before the closing `})` of `serviceSchemaBase` (after `seasons` field, ~line 21):

```typescript
  promoDiscountType: z.enum(['PERCENTAGE', 'AMOUNT']).nullable().optional(),
  promoDiscountValue: z.number().positive().max(100).nullable().optional(),
  promoStartDate: z.coerce.date().nullable().optional(),
  promoEndDate: z.coerce.date().nullable().optional(),
```

Note: `max(100)` only applies to PERCENTAGE. We'll add a superRefine for that.

- [ ] **Step 2: Add cross-field validation refinement**

Add a `.superRefine()` to `serviceSchemaBase` (or to the create/update schemas) that checks:
- If any promo field is set, all 4 must be set
- If `promoDiscountType` is PERCENTAGE, `promoDiscountValue` must be <= 100
- `promoEndDate` must be after `promoStartDate`

```typescript
const promoRefinement = (data: any, ctx: z.RefinementCtx) => {
  const hasAny = data.promoDiscountType || data.promoDiscountValue || data.promoStartDate || data.promoEndDate;
  if (hasAny) {
    if (!data.promoDiscountType || !data.promoDiscountValue || !data.promoStartDate || !data.promoEndDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'All promo fields must be set together', path: ['promoDiscountType'] });
    }
    if (data.promoDiscountType === 'PERCENTAGE' && data.promoDiscountValue > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Percentage discount cannot exceed 100', path: ['promoDiscountValue'] });
    }
    if (data.promoStartDate && data.promoEndDate && data.promoEndDate <= data.promoStartDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['promoEndDate'] });
    }
  }
};
```

Apply to createServiceSchema and updateServiceSchema via `.superRefine(promoRefinement)`.

- [ ] **Step 3: Build shared package**

```bash
cd cosmo-app && pnpm build --filter @cosmo/shared
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add promo pricing validation to shared service schema"
```

---

### Task 3: Backend Service Layer

**Files:**
- Modify: `apps/server/src/modules/services/services.service.ts` (~lines 9-145)
- Modify: `apps/server/src/modules/services/services.controller.ts` (~lines 8-51, parseServicePayload)

- [ ] **Step 1: Add promo price computation helper in services.service.ts**

Add at the top of the file (after imports):

```typescript
function computePromoPrice(service: {
  price: Decimal | number;
  promoDiscountType: string | null;
  promoDiscountValue: Decimal | number | null;
  promoStartDate: Date | null;
  promoEndDate: Date | null;
}): number | null {
  if (!service.promoDiscountType || !service.promoDiscountValue || !service.promoStartDate || !service.promoEndDate) {
    return null;
  }
  const now = new Date();
  if (now < service.promoStartDate || now > service.promoEndDate) {
    return null;
  }
  const price = Number(service.price);
  const discountValue = Number(service.promoDiscountValue);
  if (service.promoDiscountType === 'PERCENTAGE') {
    return Math.round(price * (1 - discountValue / 100) * 100) / 100;
  }
  return Math.round(Math.max(0, price - discountValue) * 100) / 100;
}
```

- [ ] **Step 2: Apply computePromoPrice in getAllServices**

In `getAllServices()` (~line 32-36), update the map to include promo fields:

```typescript
return services.map((service) => {
  const aggregate = reviewMap.get(service.id);
  return {
    ...service,
    price: Number(service.price),
    promoPrice: computePromoPrice(service),
    promoDiscountType: service.promoDiscountType,
    promoDiscountValue: service.promoDiscountValue ? Number(service.promoDiscountValue) : null,
    promoStartDate: service.promoStartDate,
    promoEndDate: service.promoEndDate,
    avgRating: aggregate?._avg?.rating ?? null,
    reviewCount: aggregate?._count?.rating ?? 0,
  };
});
```

- [ ] **Step 3: Apply computePromoPrice in getServiceBySlug**

In `getServiceBySlug()` (~line 52-56), add promoPrice to the return:

```typescript
return {
  ...service,
  price: Number(service.price),
  promoPrice: computePromoPrice(service),
  promoDiscountType: service.promoDiscountType,
  promoDiscountValue: service.promoDiscountValue ? Number(service.promoDiscountValue) : null,
  promoStartDate: service.promoStartDate,
  promoEndDate: service.promoEndDate,
  avgRating: aggregate?._avg?.rating ?? null,
  reviewCount: aggregate?._count?.rating ?? 0,
};
```

- [ ] **Step 4: Update parseServicePayload in controller**

In `parseServicePayload()` (~line 8-51), add parsing for promo fields. After existing field conversions:

```typescript
if (data.promoDiscountType !== undefined) {
  parsed.promoDiscountType = data.promoDiscountType || null;
}
if (data.promoDiscountValue !== undefined) {
  parsed.promoDiscountValue = data.promoDiscountValue ? Number(data.promoDiscountValue) : null;
}
if (data.promoStartDate !== undefined) {
  parsed.promoStartDate = data.promoStartDate ? new Date(data.promoStartDate) : null;
}
if (data.promoEndDate !== undefined) {
  parsed.promoEndDate = data.promoEndDate ? new Date(data.promoEndDate) : null;
}
```

- [ ] **Step 5: Include promo fields in createService and updateService**

In `createService()` and `updateService()`, the promo fields should pass through the spread operator naturally since they're part of the service data. Verify the `data` object is spread into `prisma.service.create/update`. No changes needed if so.

- [ ] **Step 6: Build and verify**

```bash
cd cosmo-app && pnpm build --filter server
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/services/
git commit -m "feat: compute and return promoPrice in service API responses"
```

---

### Task 4: Admin UI — Promo Section in Service Form

**Files:**
- Modify: `apps/web/src/pages/admin/Services.tsx` (~lines 16-807)

- [ ] **Step 1: Add promo fields to FormValues interface**

In `FormValues` interface (~line 16-34), add:

```typescript
promoDiscountType: string;
promoDiscountValue: string;
promoStartDate: string;
promoEndDate: string;
```

- [ ] **Step 2: Add promo defaults to EMPTY_FORM**

In `EMPTY_FORM` (~line 36-54), add:

```typescript
promoDiscountType: '',
promoDiscountValue: '',
promoStartDate: '',
promoEndDate: '',
```

- [ ] **Step 3: Add promo section to the service form UI**

After the price input section (~line 240), add a collapsible "Promocja" section:

```tsx
{/* Promocja */}
<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
  <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
    <Tag className="w-4 h-4" />
    Promocja
  </h4>

  <div className="flex items-center gap-3">
    <label className="text-sm">Typ zniżki:</label>
    <select
      value={values.promoDiscountType}
      onChange={(e) => setValues({ ...values, promoDiscountType: e.target.value })}
      className="..."
    >
      <option value="">Brak promocji</option>
      <option value="PERCENTAGE">Procentowa (%)</option>
      <option value="AMOUNT">Kwotowa (zł)</option>
    </select>
  </div>

  {values.promoDiscountType && (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs">
            Wartość {values.promoDiscountType === 'PERCENTAGE' ? '(%)' : '(zł)'}
          </label>
          <input
            type="number"
            value={values.promoDiscountValue}
            onChange={(e) => setValues({ ...values, promoDiscountValue: e.target.value })}
            min="0"
            max={values.promoDiscountType === 'PERCENTAGE' ? '100' : undefined}
            className="..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs">Od</label>
          <input
            type="date"
            value={values.promoStartDate}
            onChange={(e) => setValues({ ...values, promoStartDate: e.target.value })}
            className="..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs">Do</label>
          <input
            type="date"
            value={values.promoEndDate}
            onChange={(e) => setValues({ ...values, promoEndDate: e.target.value })}
            className="..."
          />
        </div>
      </div>

      {/* Live preview */}
      {values.price && values.promoDiscountValue && (
        <div className="text-sm text-zinc-300">
          Podgląd: <span className="line-through text-zinc-500">{Number(values.price).toFixed(2)} zł</span>
          {' → '}
          <span className="text-amber-400 font-bold">
            {values.promoDiscountType === 'PERCENTAGE'
              ? (Number(values.price) * (1 - Number(values.promoDiscountValue) / 100)).toFixed(2)
              : Math.max(0, Number(values.price) - Number(values.promoDiscountValue)).toFixed(2)
            } zł
          </span>
          {values.promoDiscountType === 'PERCENTAGE' && ` (-${values.promoDiscountValue}%)`}
        </div>
      )}
    </>
  )}
</div>
```

- [ ] **Step 4: Update buildFormData to include promo fields**

In `buildFormData()` (~line 618), add after the price field:

```typescript
if (values.promoDiscountType) {
  formData.append('promoDiscountType', values.promoDiscountType);
  formData.append('promoDiscountValue', values.promoDiscountValue);
  formData.append('promoStartDate', new Date(values.promoStartDate).toISOString());
  formData.append('promoEndDate', new Date(values.promoEndDate).toISOString());
} else {
  formData.append('promoDiscountType', '');
  formData.append('promoDiscountValue', '');
  formData.append('promoStartDate', '');
  formData.append('promoEndDate', '');
}
```

- [ ] **Step 5: Update getInitialValues to load promo data**

In `getInitialValues()` (~line 649), add:

```typescript
promoDiscountType: service.promoDiscountType ?? '',
promoDiscountValue: service.promoDiscountValue ? String(Number(service.promoDiscountValue)) : '',
promoStartDate: service.promoStartDate ? new Date(service.promoStartDate).toISOString().split('T')[0] : '',
promoEndDate: service.promoEndDate ? new Date(service.promoEndDate).toISOString().split('T')[0] : '',
```

- [ ] **Step 6: Add promo badge to admin service list cards**

In the service card display (~line 716), after the price display, add:

```tsx
{service.promoPrice && (
  <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
    {service.promoDiscountType === 'PERCENTAGE'
      ? `-${Number(service.promoDiscountValue)}%`
      : `-${Number(service.promoDiscountValue)} zł`}
  </span>
)}
{service.promoEndDate && new Date(service.promoEndDate) < new Date() && service.promoDiscountType && (
  <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
    Wygasła
  </span>
)}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/admin/Services.tsx
git commit -m "feat: add promo pricing section to admin service form"
```

---

### Task 5: Public UI — ServiceCard Promo Display

**Files:**
- Modify: `apps/web/src/components/ui/ServiceCard.tsx` (~line 6-96)

- [ ] **Step 1: Add promo fields to ServiceCardProps**

In the `service` prop interface (~line 6-20), add:

```typescript
promoPrice?: number | null;
promoDiscountType?: string | null;
promoDiscountValue?: number | null;
promoEndDate?: string | null;
```

- [ ] **Step 2: Update price display with promo styling**

Replace the price display (~line 81, `{formatPrice(service.price)}`):

```tsx
{service.promoPrice != null ? (
  <div className="flex items-center gap-2">
    <span className="text-sm line-through opacity-50">
      {formatPrice(service.price)}
    </span>
    <span className="text-base font-bold" style={{ color: '#C4965A' }}>
      {formatPrice(service.promoPrice)}
    </span>
  </div>
) : (
  <span>{formatPrice(service.price)}</span>
)}
```

- [ ] **Step 3: Add promo badge**

Add a badge element near the top of the card (e.g., absolute positioned over the image):

```tsx
{service.promoPrice != null && service.promoDiscountType && (
  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
    {service.promoDiscountType === 'PERCENTAGE'
      ? `-${Number(service.promoDiscountValue)}%`
      : `-${Number(service.promoDiscountValue)} zł`}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/ServiceCard.tsx
git commit -m "feat: show promo pricing with strikethrough and badge on service cards"
```

---

### Task 6: Public UI — ServiceDetail Promo Display

**Files:**
- Modify: `apps/web/src/pages/public/ServiceDetail.tsx` (~lines 313-316 price, ~line 236 schema)

- [ ] **Step 1: Update price display in hero section**

Replace the price display (~line 313-316):

```tsx
{service.promoPrice != null ? (
  <div className="flex items-center gap-3">
    <span className="text-xl line-through opacity-50">
      {formatPrice(service.price)}
    </span>
    <span className="text-3xl font-bold" style={{ color: '#C4965A' }}>
      {formatPrice(service.promoPrice)}
    </span>
    <span className="text-sm bg-red-500 text-white px-2 py-1 rounded-lg font-bold">
      {service.promoDiscountType === 'PERCENTAGE'
        ? `-${Number(service.promoDiscountValue)}%`
        : `-${Number(service.promoDiscountValue)} zł`}
    </span>
  </div>
) : (
  <span className="text-3xl font-bold" style={{ color: '#C4965A' }}>
    {formatPrice(service.price)}
  </span>
)}
```

- [ ] **Step 2: Add promo expiry info**

Below the price display, add:

```tsx
{service.promoEndDate && service.promoPrice != null && (
  <p className="text-sm text-amber-400/80 mt-1">
    Promocja do {new Date(service.promoEndDate).toLocaleDateString('pl-PL')}
  </p>
)}
```

- [ ] **Step 3: Update JSON-LD schema price**

In the JSON-LD schema generation (~line 236), update price to use promo price when active:

```typescript
price: String(service.promoPrice ?? service.price),
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/public/ServiceDetail.tsx
git commit -m "feat: show promo pricing on service detail page with expiry date"
```

---

### Task 7: Booking Wizard Promo Display

**Files:**
- Modify: `apps/web/src/pages/user/BookingWizard.tsx` (Step 1 service selection)

- [ ] **Step 1: Find and update service price display in Step 1**

Locate where `service.price` is displayed in the service selection step (~line 200+). Update to show promo price:

```tsx
{service.promoPrice != null ? (
  <div className="flex items-center gap-2">
    <span className="text-sm line-through opacity-50">
      {Number(service.price).toFixed(2)} zł
    </span>
    <span className="font-bold text-amber-400">
      {service.promoPrice.toFixed(2)} zł
    </span>
  </div>
) : (
  <span>{Number(service.price).toFixed(2)} zł</span>
)}
```

- [ ] **Step 2: Verify promo price is used in booking confirmation step**

Check the summary/confirmation step. It should display `promoPrice ?? price` as the service cost. Update if needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/user/BookingWizard.tsx
git commit -m "feat: show promo pricing in booking wizard service selection"
```

---

### Task 8: Build, Test, Deploy

- [ ] **Step 1: Full build check**

```bash
cd cosmo-app && pnpm build
```

Expected: No TypeScript errors across all packages.

- [ ] **Step 2: Manual verification**

Start dev server and verify:
- Admin: create service with promo, edit existing service to add promo
- Public: service list shows badges and strikethrough prices
- Public: service detail shows promo price with expiry date
- Booking: service selection shows promo price
- Expired promos: not visible on public pages, shown as "Wygasla" in admin

- [ ] **Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "feat: service promo pricing - final adjustments"
```

- [ ] **Step 4: Deploy**

```bash
cd cosmo-app && ./deploy.sh
```
