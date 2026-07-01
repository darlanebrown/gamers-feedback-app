jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewFlag: {
      create:   jest.fn(),
      findMany: jest.fn(),
      groupBy:  jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
  },
}));

import { createFlag, getReviewFlags, getFlaggedReviews } from '@/lib/flagStore';
import { prisma } from '@/lib/prisma';

const mockCreate   = (prisma.reviewFlag as any).create   as jest.Mock;
const mockFindMany = (prisma.reviewFlag as any).findMany as jest.Mock;
const mockGroupBy  = (prisma.reviewFlag as any).groupBy  as jest.Mock;
const mockReviewFindMany = (prisma.review as any).findMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createFlag', () => {
  it('creates a flag record and returns it', async () => {
    const flag = { id: 'f1', reviewId: 'r1', reporterTag: 'Darla#1', createdAt: new Date() };
    mockCreate.mockResolvedValue(flag);

    const result = await createFlag('r1', 'Darla#1');

    expect(mockCreate).toHaveBeenCalledWith({
      data: { reviewId: 'r1', reporterTag: 'Darla#1' },
    });
    expect(result).toEqual(flag);
  });
});

describe('getReviewFlags', () => {
  it('returns all flags for a review ordered by date', async () => {
    const flags = [
      { id: 'f1', reviewId: 'r1', reporterTag: 'Darla#1', createdAt: new Date() },
      { id: 'f2', reviewId: 'r1', reporterTag: 'Player#99', createdAt: new Date() },
    ];
    mockFindMany.mockResolvedValue(flags);

    const result = await getReviewFlags('r1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where:   { reviewId: 'r1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(2);
  });
});

describe('getFlaggedReviews', () => {
  it('returns reviews with flag counts, most-flagged first', async () => {
    mockGroupBy.mockResolvedValue([
      { reviewId: 'r2', _count: { id: 3 } },
      { reviewId: 'r1', _count: { id: 1 } },
    ]);
    mockReviewFindMany.mockResolvedValue([
      { id: 'r1', gameTitle: 'Hades',      reviewerTag: 'Player#1', classification: 'pending', createdAt: new Date() },
      { id: 'r2', gameTitle: 'Elden Ring', reviewerTag: 'Player#2', classification: 'helpful', createdAt: new Date() },
    ]);

    const result = await getFlaggedReviews();

    expect(result[0].reviewId).toBe('r2');
    expect(result[0].flagCount).toBe(3);
    expect(result[1].reviewId).toBe('r1');
    expect(result[1].flagCount).toBe(1);
  });

  it('returns empty array when no flags exist', async () => {
    mockGroupBy.mockResolvedValue([]);
    mockReviewFindMany.mockResolvedValue([]);

    const result = await getFlaggedReviews();

    expect(result).toEqual([]);
  });
});
