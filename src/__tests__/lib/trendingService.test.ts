import { getTrendingGames } from '@/lib/trendingService';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockGroupBy = prisma.review.groupBy as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGroupBy.mockResolvedValue([]);
});

describe('getTrendingGames', () => {
  it('returns empty array when no reviews exist', async () => {
    const result = await getTrendingGames(5, 7);
    expect(result).toEqual([]);
  });

  it('calls groupBy with a createdAt filter within the rolling window', async () => {
    const before = new Date();
    await getTrendingGames(5, 7);
    const call = mockGroupBy.mock.calls[0][0];
    expect(call.where.createdAt.gte).toBeInstanceOf(Date);
    const cutoff = call.where.createdAt.gte as Date;
    const diffMs = before.getTime() - cutoff.getTime();
    expect(diffMs).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(8 * 24 * 60 * 60 * 1000);
  });

  it('calls groupBy with take equal to the limit', async () => {
    await getTrendingGames(5, 7);
    const call = mockGroupBy.mock.calls[0][0];
    expect(call.take).toBe(5);
  });

  it('maps rows to TrendingGame shape', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Elden Ring', _count: { id: 12 }, _avg: { rating: 8.5 } },
      { gameTitle: 'Hades',      _count: { id: 5 },  _avg: { rating: 9.0 } },
    ]);
    const result = await getTrendingGames(5, 7);
    expect(result).toEqual([
      { gameTitle: 'Elden Ring', reviewCount: 12, avgRating: 8.5 },
      { gameTitle: 'Hades',      reviewCount: 5,  avgRating: 9.0 },
    ]);
  });

  it('rounds avgRating to 1 decimal place', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Test Game', _count: { id: 3 }, _avg: { rating: 7.666 } },
    ]);
    const result = await getTrendingGames(5, 7);
    expect(result[0].avgRating).toBe(7.7);
  });
});
