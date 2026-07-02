jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewVote: { groupBy: jest.fn() },
    review: { findMany: jest.fn() },
  },
}));

import { getTrendingReviews } from '@/lib/trendingReviewsService';
import { prisma } from '@/lib/prisma';

const mockGroupBy  = prisma.reviewVote.groupBy  as jest.Mock;
const mockFindMany = prisma.review.findMany     as jest.Mock;

const NOW = new Date('2026-07-01T00:00:00.000Z');

beforeEach(() => {
  jest.resetAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => jest.useRealTimers());

describe('getTrendingReviews', () => {
  it('returns reviews ordered by recent upvote count', async () => {
    mockGroupBy.mockResolvedValue([
      { reviewId: 'r2', _count: { id: 10 } },
      { reviewId: 'r1', _count: { id: 5 } },
    ]);
    mockFindMany.mockResolvedValue([
      { id: 'r2', gameTitle: 'Elden Ring', classification: 'helpful', reviewerTag: 'A#1', rating: 10, headline: 'Epic', body: 'Great', platform: 'PC', pros: null, cons: null, playtime: null, classificationReason: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'r1', gameTitle: 'Hades', classification: 'helpful', reviewerTag: 'B#1', rating: 9, headline: 'Fun', body: 'Solid', platform: 'PC', pros: null, cons: null, playtime: null, classificationReason: null, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const results = await getTrendingReviews(10, 7);

    expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['reviewId'],
      where: expect.objectContaining({ type: 'up', createdAt: expect.any(Object) }),
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }));
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('r2');
    expect(results[0].recentVotes).toBe(10);
    expect(results[1].recentVotes).toBe(5);
  });

  it('returns empty array when no votes in window', async () => {
    mockGroupBy.mockResolvedValue([]);
    const results = await getTrendingReviews(10, 7);
    expect(results).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
