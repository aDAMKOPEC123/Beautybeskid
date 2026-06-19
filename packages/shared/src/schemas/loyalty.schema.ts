// filepath: packages/shared/src/schemas/loyalty.schema.ts
import { z } from 'zod';
import { TransactionType } from '../types/loyalty.types';

export const adjustPointsSchema = z.object({
  userId: z.string().min(1, 'ID użytkownika jest wymagane'),
  points: z.number().int(),
  type: z.nativeEnum(TransactionType),
  description: z.string().min(3, 'Opis jest wymagany')
});

export const redeemRewardSchema = z.object({
  rewardId: z.string().min(1, 'ID nagrody jest wymagane')
});

export const createLoyaltyRewardSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional().or(z.literal('')),
  pointsCost: z.number().int().min(1),
  requiredTier: z.enum(['BRONZE', 'SILVER', 'GOLD']).nullable().optional(),
  isForAllServices: z.boolean().default(true),
  applicableServiceIds: z.array(z.string()).optional(),
  discountType: z.enum(['PERCENTAGE', 'AMOUNT', 'OTHER']).default('AMOUNT'),
  discountValue: z.number().optional()
});

export const updateUserTierSchema = z.object({
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD'])
});

export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
export type CreateLoyaltyRewardInput = z.infer<typeof createLoyaltyRewardSchema>;
export type UpdateUserTierInput = z.infer<typeof updateUserTierSchema>;
