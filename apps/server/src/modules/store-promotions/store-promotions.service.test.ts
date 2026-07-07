import { describe, expect, it } from 'vitest';
import { createStorePromotionSchema } from '@cosmo/shared';
import { getActivePromotionsWhere } from './store-promotions.filters';
import { promotionMatchesUser } from './store-promotions.service';

const validPromotion = {
  storeName: 'Hebe',
  title: '-20% na pielęgnację',
  description: 'Promocja na wybrane produkty.',
  conditions: 'Do wyczerpania zapasów.',
  discountValue: '-20%',
  startDate: '2026-07-06T08:00:00.000Z',
  endDate: '2026-07-10T20:00:00.000Z',
};

describe('store promotions', () => {
  it('buduje filtr obejmujący wyłącznie widoczne promocje w aktualnym terminie', () => {
    const now = new Date('2026-07-08T12:00:00.000Z');

    expect(getActivePromotionsWhere(now)).toEqual({
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    });
  });

  it('odrzuca datę zakończenia wcześniejszą niż data rozpoczęcia', () => {
    const result = createStorePromotionSchema.safeParse({
      ...validPromotion,
      endDate: '2026-07-05T20:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('odrzuca niepoprawny link do oferty', () => {
    const result = createStorePromotionSchema.safeParse({
      ...validPromotion,
      link: 'to nie jest adres',
    });

    expect(result.success).toBe(false);
  });

  it('dopasowuje promocję targetowaną po poziomie lojalności i typie skóry', () => {
    expect(promotionMatchesUser(
      {
        targetLoyaltyTiers: ['GOLD'],
        targetSkinTypes: ['WRAZLIWA'],
        targetConcerns: ['przebarwienia'],
      },
      {
        id: 'user-1',
        loyaltyTier: 'GOLD',
        skinWeatherProfile: {
          skinType: 'WRAZLIWA',
          skinConcerns: ['Przebarwienia', 'odwodnienie'],
        },
      },
    )).toBe(true);
  });

  it('ukrywa promocję, gdy klient nie spełnia targetowania', () => {
    expect(promotionMatchesUser(
      {
        targetLoyaltyTiers: ['GOLD'],
        targetSkinTypes: [],
        targetConcerns: [],
      },
      {
        id: 'user-2',
        loyaltyTier: 'BRONZE',
        skinWeatherProfile: null,
      },
    )).toBe(false);
  });
});
