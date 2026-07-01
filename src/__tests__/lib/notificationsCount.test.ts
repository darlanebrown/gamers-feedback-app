jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      count:    jest.fn(),
    },
  },
}));

import { countNotifications } from '@/lib/notificationStore';
import { prisma } from '@/lib/prisma';

const mockCount = (prisma.notification.count as jest.Mock);

beforeEach(() => jest.resetAllMocks());

describe('countNotifications', () => {
  it('calls prisma.notification.count with userTag filter', async () => {
    mockCount.mockResolvedValue(15);
    const result = await countNotifications('Darla#1');
    expect(result).toBe(15);
    expect(mockCount).toHaveBeenCalledWith({ where: { userTag: 'Darla#1' } });
  });

  it('returns 0 when no notifications exist', async () => {
    mockCount.mockResolvedValue(0);
    const result = await countNotifications('Ghost#99');
    expect(result).toBe(0);
  });
});
