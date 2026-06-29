import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    skinTypeAdvice: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getSkinTypeAdvice, matchRulesToWeather, updateSkinTypeAdvice } from './skin-weather.service';

describe('getSkinTypeAdvice', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all advice records ordered by skinType', async () => {
    const fakeRecords = [
      { id: '1', skinType: 'SUCHA', content: 'porada', updatedAt: new Date() },
    ];
    vi.mocked(prisma.skinTypeAdvice.findMany).mockResolvedValue(fakeRecords as any);

    const result = await getSkinTypeAdvice();
    expect(result).toEqual(fakeRecords);
    expect(prisma.skinTypeAdvice.findMany).toHaveBeenCalledWith({ orderBy: { skinType: 'asc' } });
  });
});

describe('updateSkinTypeAdvice', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws 400 for invalid skinType', async () => {
    await expect(updateSkinTypeAdvice('INVALID', 'treść')).rejects.toThrow('Nieprawidłowy typ skóry');
  });

  it('upserts record for valid skinType', async () => {
    const fakeRecord = { id: '1', skinType: 'SUCHA', content: 'treść', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    const result = await updateSkinTypeAdvice('SUCHA', 'treść');
    expect(result).toEqual(fakeRecord);
    expect(prisma.skinTypeAdvice.upsert).toHaveBeenCalledWith({
      where: { skinType: 'SUCHA' },
      update: { content: 'treść' },
      create: { skinType: 'SUCHA', content: 'treść' },
    });
  });

  it('allows empty content (admin can clear advice)', async () => {
    const fakeRecord = { id: '1', skinType: 'TLUSTA', content: '', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    await expect(updateSkinTypeAdvice('TLUSTA', '')).resolves.not.toThrow();
  });
});

describe('matchRulesToWeather', () => {
  it('keeps the most specific matching weather rule and skips broader repeats', () => {
    const weather = {
      current: {
        temperature_2m: 31,
        uv_index: 7,
        relative_humidity_2m: 82,
        precipitation_probability: 10,
        cloud_cover: 20,
      },
    };
    const airQuality = { current: { european_aqi: 20 } };
    const rules = [
      {
        label: 'Upalny dzień',
        recommendation: 'Ogólna porada na upał.',
        isActive: true,
        sortOrder: 1,
        conditions: ['temperature'],
        thresholds: { temperature: { min: 28, max: 45 } },
      },
      {
        label: 'Silne UV',
        recommendation: 'Ogólna porada na UV.',
        isActive: true,
        sortOrder: 2,
        conditions: ['uv'],
        thresholds: { uv: { min: 6, max: 11 } },
      },
      {
        label: 'Lato — upał, wysokie UV i lepka wilgotność',
        recommendation: 'Sezonowa porada na lato.',
        isActive: true,
        sortOrder: 180,
        conditions: ['temperature', 'uv', 'humidity'],
        thresholds: {
          temperature: { min: 27, max: 45 },
          uv: { min: 6, max: 11 },
          humidity: { min: 50, max: 100 },
        },
      },
    ];

    expect(matchRulesToWeather(rules, weather, airQuality)).toEqual([
      {
        label: 'Lato — upał, wysokie UV i lepka wilgotność',
        recommendation: 'Sezonowa porada na lato.',
      },
    ]);
  });
});
