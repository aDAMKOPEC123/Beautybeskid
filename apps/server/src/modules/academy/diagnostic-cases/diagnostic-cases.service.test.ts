import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  caseStudyFindMany: vi.fn(),
  caseStudyFindUnique: vi.fn(),
  caseStudyCreate: vi.fn(),
  caseStudyUpdate: vi.fn(),
  caseStudyDelete: vi.fn(),
  attemptCreate: vi.fn(),
  enrollmentFindFirst: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({
  prisma: {
    diagnosticCaseStudy: {
      findMany: mocks.caseStudyFindMany,
      findUnique: mocks.caseStudyFindUnique,
      create: mocks.caseStudyCreate,
      update: mocks.caseStudyUpdate,
      delete: mocks.caseStudyDelete,
    },
    diagnosticCaseAttempt: { create: mocks.attemptCreate },
    academyEnrollment: { findFirst: mocks.enrollmentFindFirst },
  },
}));

import * as casesService from './diagnostic-cases.service';

describe('Diagnostic Cases Service', () => {
  beforeEach(() => Object.values(mocks).forEach(m => m.mockReset()));

  describe('listForCourse', () => {
    it('returns published case studies for a course the user owns', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindMany.mockResolvedValue([
        { id: 'cs1', title: 'Przebarwienia', published: true },
      ]);
      const result = await casesService.listForCourse('user1', 'kurs-slug');
      expect(result).toHaveLength(1);
    });

    it('throws 403 when user has no enrollment for this course', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue(null);
      await expect(casesService.listForCourse('user1', 'kurs-slug'))
        .rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getCaseStudy', () => {
    it('returns case study with steps and images', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindUnique.mockResolvedValue({
        id: 'cs1', published: true,
        course: { slug: 'kurs-slug' },
        steps: [{ id: 's1', type: 'INTERVIEW', answers: [], images: [] }],
      });
      const result = await casesService.getCaseStudy('user1', 'cs1');
      expect(result.steps).toHaveLength(1);
    });

    it('throws 404 for unpublished case study', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindUnique.mockResolvedValue({ published: false, course: { slug: 'x' } });
      await expect(casesService.getCaseStudy('user1', 'cs1'))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('submitAttempt', () => {
    it('calculates score and saves attempt', async () => {
      mocks.caseStudyFindUnique.mockResolvedValue({
        id: 'cs1', published: true,
        course: { slug: 'kurs-slug' },
        steps: [
          { id: 's1', type: 'INTERVIEW', answers: [{ id: 'a1', isCorrect: true }, { id: 'a2', isCorrect: false }] },
          { id: 's2', type: 'DIAGNOSIS', answers: [{ id: 'a3', isCorrect: true }] },
          { id: 's3', type: 'RESULT', answers: [] },
        ],
      });
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.attemptCreate.mockImplementation((args: any) => Promise.resolve({ id: 'att1', ...args.data }));

      const result = await casesService.submitAttempt('user1', 'cs1', [
        { stepId: 's1', selectedAnswerIds: ['a1'] },
        { stepId: 's2', selectedAnswerIds: ['a3'] },
      ]);
      expect(result.score).toBe(2);
      expect(result.maxScore).toBe(2);
      expect(mocks.attemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 2, maxScore: 2 }) })
      );
    });
  });

  describe('adminCreateCaseStudy', () => {
    it('rejects case study with less than 2 steps', async () => {
      await expect(casesService.adminCreateCaseStudy({
        title: 'Test', clientName: 'Anna', clientAge: 30,
        clientDescription: 'Opis', steps: [{ type: 'INTERVIEW', content: 'x' }],
      })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects when last step is not RESULT', async () => {
      await expect(casesService.adminCreateCaseStudy({
        title: 'Test', clientName: 'Anna', clientAge: 30,
        clientDescription: 'Opis',
        steps: [
          { type: 'INTERVIEW', content: 'x', answers: [] },
          { type: 'DIAGNOSIS', content: 'y', answers: [] },
        ],
      })).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
