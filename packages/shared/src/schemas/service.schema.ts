// filepath: packages/shared/src/schemas/service.schema.ts
import { z } from 'zod';
import { Season } from '../types/service.types';

const serviceSchemaBase = z.object({
  name: z.string().min(3, 'Nazwa musi miec co najmniej 3 znaki'),
  description: z.string().min(10, 'Opis musi miec co najmniej 10 znakow'),
  price: z.number().positive('Cena musi byc dodatnia'),
  durationMinutes: z.number().int().positive('Czas trwania musi byc dodatni'),
  category: z.string().min(2, 'Kategoria jest wymagana'),
  displayOrder: z.number().int().positive('Kolejnosc musi byc dodatnia liczba calkowita').default(1),
  isActive: z.boolean().default(true),
  employeeIds: z.array(z.string()).optional(),
  detailedContent: z.string().nullable().optional(),
  routineFirst48h: z.string().nullable().optional(),
  routineFollowingDays: z.string().nullable().optional(),
  routineProducts: z.string().nullable().optional(),
  recommendedIntervalDays: z.number().int().positive().nullable().optional(),
  isMultiVisit: z.boolean().default(false),
  seriesIntervalsDays: z.array(z.number().int().positive('Interwal musi byc dodatni')).default([]),
  seasons: z.array(z.nativeEnum(Season)).default([]),
  promoDiscountType: z.enum(['PERCENTAGE', 'AMOUNT']).nullable().optional(),
  promoDiscountValue: z.number().positive().nullable().optional(),
  promoStartDate: z.coerce.date().nullable().optional(),
  promoEndDate: z.coerce.date().nullable().optional(),
});

const validatePromoConfig = (
  data: {
    promoDiscountType?: string | null;
    promoDiscountValue?: number | null;
    promoStartDate?: Date | null;
    promoEndDate?: Date | null;
  },
  ctx: z.RefinementCtx,
) => {
  const fields = [data.promoDiscountType, data.promoDiscountValue, data.promoStartDate, data.promoEndDate];
  const hasAny = fields.some((f) => f != null);
  const hasAll = fields.every((f) => f != null);

  if (hasAny && !hasAll) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['promoDiscountType'],
      message: 'Wszystkie pola promocji musza byc ustawione razem',
    });
    return;
  }

  if (hasAll) {
    if (data.promoDiscountType === 'PERCENTAGE' && data.promoDiscountValue! > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promoDiscountValue'],
        message: 'Rabat procentowy nie moze przekraczac 100%',
      });
    }
    if (data.promoEndDate! <= data.promoStartDate!) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promoEndDate'],
        message: 'Data zakonczenia musi byc pozniejsza niz data rozpoczecia',
      });
    }
  }
};

const validateSeriesConfig = (
  data: { isMultiVisit?: boolean; seriesIntervalsDays?: number[] },
  ctx: z.RefinementCtx,
) => {
  const intervals = data.seriesIntervalsDays ?? [];

  if (data.isMultiVisit && intervals.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['seriesIntervalsDays'],
      message: 'Usluga wielowizytowa musi miec co najmniej jeden interwal',
    });
  }

  if (data.isMultiVisit === false && intervals.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['seriesIntervalsDays'],
      message: 'Interwaly serii mozna ustawic tylko dla uslugi wielowizytowej',
    });
  }
};

export const createServiceSchema = serviceSchemaBase
  .superRefine(validateSeriesConfig)
  .superRefine(validatePromoConfig);

export const updateServiceSchema = serviceSchemaBase.partial().superRefine((data, ctx) => {
  validateSeriesConfig(
    {
      isMultiVisit: data.isMultiVisit,
      seriesIntervalsDays: data.seriesIntervalsDays ?? [],
    },
    ctx,
  );
  validatePromoConfig(data, ctx);
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
