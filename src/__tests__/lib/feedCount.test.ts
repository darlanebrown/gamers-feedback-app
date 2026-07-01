jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
      count:    jest.fn(),
    },
  },
}));

import { countReviewsByTags } from '@/lib/reviewStore';
import { prisma } from '@/lib/prisma';

const mockCount = (prisma.review.count as jest.Mock);

beforeEach(() => jest.resetAllMocks());

describe('countReviewsByTags', () => {
  it('returns 0 without hitting the DB when tags array is empty', async () => {
    const result = await countReviewsByTags([]);
    expect(result).toBe(0);
    expect(mockCount).not.toHaveBeenCalled();
  });

  it('calls prisma.review.count with reviewerTag in filter', async () => {
    mockCount.mockResolvedValue(7);
    const result = await countReviewsByTags(['Alice#1', 'Bob#2']);
    expect(result).toBe(7);
    expect(mockCount).toHaveBeenCalledWith({
      where: { reviewerTag: { in: ['Alice#1', 'Bob#2'] } },
    });
  });

  it('returns the count from the DB', async () => {
    mockCount.mockResolvedValue(42);
    const result = await countReviewsByTags(['X#1']);
    expect(result).toBe(42);
  });
});
