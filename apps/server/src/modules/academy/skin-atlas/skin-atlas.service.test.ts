import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  regionFindMany: vi.fn(),
  regionFindUnique: vi.fn(),
  regionCreate: vi.fn(),
  regionUpdate: vi.fn(),
  regionDelete: vi.fn(),
  conditionFindMany: vi.fn(),
  conditionFindUnique: vi.fn(),
  conditionCreate: vi.fn(),
  conditionUpdate: vi.fn(),
  conditionDelete: vi.fn(),
  quizQuestionFindMany: vi.fn(),
  quizAttemptCreate: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({
  prisma: {
    skinAtlasRegion: {
      findMany: mocks.regionFindMany,
      findUnique: mocks.regionFindUnique,
      create: mocks.regionCreate,
      update: mocks.regionUpdate,
      delete: mocks.regionDelete,
    },
    skinAtlasCondition: {
      findMany: mocks.conditionFindMany,
      findUnique: mocks.conditionFindUnique,
      create: mocks.conditionCreate,
      update: mocks.conditionUpdate,
      delete: mocks.conditionDelete,
    },
    skinAtlasQuizQuestion: { findMany: mocks.quizQuestionFindMany },
    skinAtlasQuizAttempt: { create: mocks.quizAttemptCreate },
  },
}));

import * as atlasService from './skin-atlas.service';

describe('Skin Atlas Service', () => {
  beforeEach(() => Object.values(mocks).forEach(m => m.mockReset()));

  describe('listPublishedRegions', () => {
    it('returns only published regions with condition counts', async () => {
      mocks.regionFindMany.mockResolvedValue([
        { id: 'r1', name: 'Twarz', slug: 'twarz', published: true, _count: { conditions: 5 } },
      ]);
      const result = await atlasService.listPublishedRegions();
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('twarz');
      expect(mocks.regionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } })
      );
    });
  });

  describe('getConditionBySlug', () => {
    it('returns condition with images and related course', async () => {
      mocks.conditionFindUnique.mockResolvedValue({
        id: 'c1', slug: 'tradzik', published: true,
        region: { slug: 'twarz', name: 'Twarz' },
        images: [], relatedCourse: null,
      });
      const result = await atlasService.getConditionBySlug('tradzik');
      expect(result.slug).toBe('tradzik');
    });

    it('throws 404 for unpublished condition', async () => {
      mocks.conditionFindUnique.mockResolvedValue({ published: false });
      await expect(atlasService.getConditionBySlug('hidden'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 for nonexistent condition', async () => {
      mocks.conditionFindUnique.mockResolvedValue(null);
      await expect(atlasService.getConditionBySlug('nope'))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('adminCreateRegion', () => {
    it('rejects slug "quiz" as reserved', async () => {
      await expect(atlasService.adminCreateRegion({ name: 'Quiz', slug: 'quiz' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects empty name', async () => {
      await expect(atlasService.adminCreateRegion({ name: '', slug: 'test' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates region with valid data', async () => {
      mocks.regionCreate.mockResolvedValue({ id: 'r1', name: 'Twarz', slug: 'twarz' });
      const result = await atlasService.adminCreateRegion({ name: 'Twarz', slug: 'twarz' });
      expect(result.name).toBe('Twarz');
    });
  });

  describe('getQuizQuestions', () => {
    it('returns questions for a specific region', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([
        { id: 'q1', questionText: 'Co to?', answers: [{ id: 'a1', text: 'Tradzik', isCorrect: true }] },
      ]);
      const result = await atlasService.getQuizQuestions('twarz');
      expect(result).toHaveLength(1);
    });

    it('returns questions from all regions when regionSlug is null', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([]);
      await atlasService.getQuizQuestions(null);
      expect(mocks.quizQuestionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { condition: { region: { published: true }, published: true } } })
      );
    });
  });

  describe('submitQuizAttempt', () => {
    it('creates attempt with calculated score', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([
        { id: 'q1', answers: [{ id: 'a1', isCorrect: true }, { id: 'a2', isCorrect: false }] },
        { id: 'q2', answers: [{ id: 'a3', isCorrect: false }, { id: 'a4', isCorrect: true }] },
      ]);
      mocks.quizAttemptCreate.mockImplementation((args: any) => Promise.resolve({ id: 'att1', ...args.data }));

      const result = await atlasService.submitQuizAttempt('user1', null, [
        { questionId: 'q1', selectedAnswerId: 'a1' },
        { questionId: 'q2', selectedAnswerId: 'a3' },
      ]);
      expect(result.score).toBe(1);
      expect(result.maxScore).toBe(2);
      expect(mocks.quizAttemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 1, maxScore: 2 }) })
      );
    });
  });
});
