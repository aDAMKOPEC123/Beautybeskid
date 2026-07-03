import { describe, expect, it } from 'vitest';
import { createSlug } from './slug';

describe('createSlug', () => {
  it('transliterates Polish characters instead of dropping them', () => {
    expect(createSlug('Lifting Rzęs z Koloryzacją')).toBe('lifting-rzes-z-koloryzacja');
    expect(createSlug('Regulacja Brwi Wosk/Pęseta')).toBe('regulacja-brwi-wosk-peseta');
    expect(createSlug('Depilacja Wąsika')).toBe('depilacja-wasika');
    expect(createSlug('Łagodzący zabieg na żółtą cerę')).toBe('lagodzacy-zabieg-na-zolta-cere');
  });
});
