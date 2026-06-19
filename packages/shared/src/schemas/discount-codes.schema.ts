import { z } from 'zod';

export const createDiscountCodeSchema = z.object({
  code: z.string().min(3).max(32).regex(/^[A-Z0-9]+$/i),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  discountValue: z.number().positive(),
  isMultiUse: z.boolean().default(false),
});

export const updateAmbassadorConfigSchema = z.object({
  discountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  discountValue: z.number().positive(),
  referrerDiscountType: z.enum(['PERCENTAGE', 'AMOUNT']),
  referrerDiscountValue: z.number().positive(),
});

export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeSchema>;
export type UpdateAmbassadorConfigInput = z.infer<typeof updateAmbassadorConfigSchema>;
