jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { countReviews } from '@/lib/reviewStore';

const mockCount = prisma.review.count as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockCount.mockResolvedValue(0);
});

describe('countReviews', () => {
  it('returns 0 when no reviews match', async () => {
    mockCount.mockResolvedValue(0);
    const result = await countReviews({});
    expect(result).toBe(0);
  });

  it('passes keyword search to where clause', async () => {
    mockCount.mockResolvedValue(3);
    await countReviews({ q: 'elden ring' });
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });

  it('passes platform filter to where clause', async () => {
    mockCount.mockResolvedValue(5);
    await countReviews({ platform: 'PC' });
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ platform: expect.any(Object) }),
      }),
    );
  });

  it('ignores page and limit — counts all matching rows', async () => {
    mockCount.mockResolvedValue(42);
    const result = await countReviews({ q: 'hades', page: 3, limit: 10 });
    expect(result).toBe(42);
    // count should not include skip/take
    expect(mockCount).not.toHaveBeenCalledWith(
      expect.objectContaining({ skip: expect.any(Number) }),
    );
  });
});
