# Service Promo Pricing — Design Spec

## Overview

Add promotional pricing directly on the Service model. Admin sets a discount (percentage or fixed amount) with a mandatory end date. The promo is visible on all public pages, booking wizard, and managed from the existing admin service form.

## Data Model

Add 4 nullable fields to `Service` in Prisma schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `promoDiscountType` | `DiscountType?` | When promo active | PERCENTAGE or AMOUNT (reuses existing enum) |
| `promoDiscountValue` | `Decimal(10,2)?` | When promo active | e.g. 10 for -10% or 20 for -20 PLN |
| `promoStartDate` | `DateTime?` | When promo active | When promo becomes active |
| `promoEndDate` | `DateTime?` | When promo active | When promo expires (required for any promo) |

All 4 fields are null when no promo is set. Setting a promo requires all 4 fields.

## Backend Changes

### API Response

`getAllServices()` and `getServiceBySlug()` return a computed `promoPrice` field:

```typescript
// If promo is active (startDate <= now <= endDate):
promoPrice = discountType === 'PERCENTAGE'
  ? price * (1 - discountValue / 100)
  : Math.max(0, price - discountValue)

// If no active promo: promoPrice = null
```

The API also returns raw promo fields so admin can edit them.

### Validation

- `promoDiscountValue` must be > 0
- For PERCENTAGE: must be <= 100
- `promoEndDate` must be after `promoStartDate`
- All 4 promo fields must be set together or all null

### Endpoints

No new endpoints. Existing `PUT /api/services/:id` accepts the 4 new fields.

## Frontend Changes

### Admin Panel (Services.tsx)

Add a "Promocja" section in the service edit form:
- Toggle/checkbox to enable promo
- Dropdown: Procentowa / Kwotowa
- Input: wartość zniżki
- Date pickers: data rozpoczęcia, data zakończenia
- Live preview: "149 zł → 134,10 zł (-10%)"

### Public Pages

**ServiceCard.tsx:**
- When `promoPrice` is set: show original price with strikethrough + promo price in accent color
- Badge with discount label (e.g. "-10%" or "-20 zł")

**ServiceDetail.tsx:**
- Same strikethrough treatment
- Text: "Promocja do DD.MM.YYYY"

### Booking Wizard (BookingWizard.tsx)

- Show promo price alongside original when selecting service
- Use promo price for appointment total calculation

## Shared Schema

Add promo fields to `serviceSchemaBase` in `packages/shared/src/schemas/service.schema.ts`.

## Discount Stacking Policy

Promo price becomes the new base price. Other discounts (happy hour, discount code, voucher) apply on top of the promo price — but only one additional discount per appointment (matching existing single-discount model). Example: service 149 PLN with -10% promo = 134.10 PLN base, then a 20 PLN discount code brings it to 114.10 PLN.

## Rounding

All promo price calculations round to 2 decimal places using half-up rounding (standard for PLN currency).

## Timezone

`promoStartDate` and `promoEndDate` are stored as UTC. The backend comparison uses Europe/Warsaw timezone for determining if a promo is active. Admin UI date pickers operate in local (Warsaw) time.

## Validation (additional)

- `promoDiscountType` must be PERCENTAGE or AMOUNT (reject OTHER)
- Toggling promo off in admin sets all 4 fields to null
- Expired promos (past endDate) are shown as "Wygasla" in admin UI but not visible to public
- `promoStartDate` defaults to current date in admin form

## Migration

Single Prisma migration adding 4 nullable columns. No data migration needed — existing services start with null promo fields.
