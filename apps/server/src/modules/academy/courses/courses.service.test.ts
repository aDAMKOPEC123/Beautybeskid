import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ courseFindMany: vi.fn(), enrollmentFindMany: vi.fn(), progressFindMany: vi.fn() }));
vi.mock('../../../config/prisma', () => ({ prisma: {
  course: { findMany: mocks.courseFindMany },
  academyEnrollment: { findMany: mocks.enrollmentFindMany },
  userCourseProgress: { findMany: mocks.progressFindMany },
} }));

import { calculateLowestPriorPrice, listPublished } from './courses.service';

describe('Academy course list', () => {
  beforeEach(() => Object.values(mocks).forEach(mock => mock.mockReset()));

  it('returns zero progress for a purchased but not started course', async () => {
    mocks.courseFindMany.mockResolvedValue([{ id: 'course-1', modules: [{ lessons: [{ id: 'lesson-1' }] }] }]);
    mocks.enrollmentFindMany.mockResolvedValue([{ courseId: 'course-1' }]);
    mocks.progressFindMany.mockResolvedValue([]);
    const result = await listPublished('user-1');
    expect(result[0]).toMatchObject({ lessonCount: 1, progress: { percentComplete: 0, completedAt: null, startedAt: null } });
  });
});

describe('Academy promotional price history', () => {
  it('excludes the current promotional price and includes the price active at the 30-day boundary', () => {
    const day = 24 * 60 * 60 * 1000;
    const result = calculateLowestPriorPrice([
      { price: 100, validFrom: new Date(Date.now() - 45 * day) },
      { price: 90, validFrom: new Date(Date.now() - 10 * day) },
      { price: 79, validFrom: new Date() },
    ], 79, true);
    expect(result).toBe(90);
  });

  it('returns the previous regular price for a new reduction', () => {
    const result = calculateLowestPriorPrice([{ price: 100, validFrom: new Date(Date.now() - 60_000) }, { price: 80, validFrom: new Date() }], 80, true);
    expect(result).toBe(100);
  });
});
