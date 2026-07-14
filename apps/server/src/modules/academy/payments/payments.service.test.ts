import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  courseFindFirst: vi.fn(), enrollmentFindUnique: vi.fn(), userFindUnique: vi.fn(), bundleFindFirst: vi.fn(),
  orderCreate: vi.fn(), orderFindFirst: vi.fn(), currentVersions: vi.fn(), commerceInfo: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({ prisma: {
  course: { findFirst: mocks.courseFindFirst },
  academyEnrollment: { findUnique: mocks.enrollmentFindUnique },
  academyUser: { findUnique: mocks.userFindUnique },
  academyBundle: { findFirst: mocks.bundleFindFirst },
  academyOrder: { create: mocks.orderCreate, findFirst: mocks.orderFindFirst },
} }));
vi.mock('../../../config/env', () => ({ env: { STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined, ACADEMY_URL: 'http://localhost:5174' } }));
vi.mock('../legal/legal.service', () => ({
  getCurrentVersions: mocks.currentVersions,
  getPublicCommerceInfo: mocks.commerceInfo,
  getDocumentVersion: vi.fn(),
}));
vi.mock('../../../utils/email', () => ({ sendEmail: vi.fn() }));

import { createBundleCheckout, createCourseCheckout } from './payments.service';

const consent = {
  termsAccepted: true, immediateDeliveryConsent: true, withdrawalAcknowledged: true,
  termsVersion: '2026-07-15', privacyVersion: '2026-07-15', billingName: 'Anna Kowalska',
};

describe('Academy checkout without Stripe credentials', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.enrollmentFindUnique.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue({ id: 'user-1', email: 'anna@example.com', emailVerifiedAt: new Date() });
    mocks.currentVersions.mockResolvedValue({ termsVersion: '2026-07-15', privacyVersion: '2026-07-15' });
    mocks.commerceInfo.mockResolvedValue({ readiness: { sellerComplete: true, legalDocumentsComplete: true, stripeConfigured: false } });
  });

  it('does not create a charge or order when a published course has no valid paid price', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', price: 0, isFree: false, isComingSoon: false, accessDays: null });
    await expect(createCourseCheckout('user-1', 'course-1', consent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });

  it('blocks a valid checkout before creating an order while Stripe is intentionally disconnected', async () => {
    mocks.courseFindFirst.mockResolvedValue({ id: 'course-1', title: 'Kurs', description: 'Opis', price: 199, isFree: false, isComingSoon: false, accessDays: 365 });
    await expect(createCourseCheckout('user-1', 'course-1', consent)).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });

  it('rejects an empty bundle as a product', async () => {
    mocks.bundleFindFirst.mockResolvedValue({ id: 'bundle-1', price: 299, courses: [] });
    await expect(createBundleCheckout('user-1', 'bundle-1', consent)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });
});
