// filepath: packages/shared/src/schemas/service.schema.ts
import { z } from 'zod';
import { Season } from '../types/service.types';

const serviceSchemaBase = z.object({
  name: z.string().min(3, 'Nazwa musi miec co najmniej 3 znaki'),
  description: z.string().min(10, 'Opis musi miec co najmniej 10 znakow'),
  price: z.number().positive('Cena musi byc dodatnia'),
  durationMinutes: z.number().int().positive('Czas trwania musi byc dodatni'),
  category: z.string().min(2, 'Kategoria jest wymagana'),
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
});

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

export const createServiceSchema = serviceSchemaBase.superRefine(validateSeriesConfig);

export const updateServiceSchema = serviceSchemaBase.partial().superRefine((data, ctx) => {
  validateSeriesConfig(
    {
      isMultiVisit: data.isMultiVisit,
      seriesIntervalsDays: data.seriesIntervalsDays ?? [],
    },
    ctx,
  );
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
