import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    notification: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { markRouteRead } from './notifications.service';

describe('markRouteRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 3 });
  });

  it('marks only unread admin notifications assigned to the selected route', async () => {
    const count = await markRouteRead('admin-1', '/admin/wizyty', 'ADMIN');

    expect(count).toBe(3);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'admin-1',
        audience: 'ADMIN',
        readAt: null,
        OR: [
          { url: '/admin/wizyty' },
          { url: { startsWith: '/admin/wizyty/' } },
          { url: { startsWith: '/admin/wizyty?' } },
          { url: { startsWith: '/admin/wizyty#' } },
        ],
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it('uses the user audience by default', async () => {
    await markRouteRead('user-1', '/user/wizyty');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', audience: 'USER' }),
      }),
    );
  });
});
