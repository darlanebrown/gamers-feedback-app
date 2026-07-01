jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getReviewedGames } from '@/lib/gameAnalytics';

const mockGroupBy = prisma.review.groupBy as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGroupBy.mockResolvedValue([]);
});

describe('getReviewedGames', () => {
  it('returns empty array when no helpful reviews exist', async () => {
    const result = await getReviewedGames({ limit: 24, offset: 0, sort: 'reviews' });
    expect(result).toEqual([]);
  });

  it('passes limit and skip to groupBy', async () => {
    await getReviewedGames({ limit: 10, offset: 20, sort: 'reviews' });
    const call = mockGroupBy.mock.calls[0][0];
    expect(call.take).toBe(10);
    expect(call.skip).toBe(20);
  });

  it('maps rows to ReviewedGame shape', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Elden Ring', _count: { id: 12 }, _avg: { rating: 8.5 } },
    ]);
    const result = await getReviewedGames({ limit: 24, offset: 0, sort: 'reviews' });
    expect(result[0]).toMatchObject({
      gameTitle:   'Elden Ring',
      reviewCount: 12,
      avgRating:   8.5,
    });
  });

  it('rounds avgRating to 1 decimal place', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Hades', _count: { id: 3 }, _avg: { rating: 8.333 } },
    ]);
    const result = await getReviewedGames({ limit: 24, offset: 0, sort: 'reviews' });
    expect(result[0].avgRating).toBe(8.3);
  });

  it('orders by avg rating descending when sort is "rating"', async () => {
    await getReviewedGames({ limit: 24, offset: 0, sort: 'rating' });
    const call = mockGroupBy.mock.calls[0][0];
    expect(call.orderBy).toMatchObject({ _avg: { rating: 'desc' } });
  });
});
