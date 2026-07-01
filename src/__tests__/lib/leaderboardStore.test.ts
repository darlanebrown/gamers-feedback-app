jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    review: {
      groupBy: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getTopReviewers, getTopGames } from '@/lib/leaderboardStore';

const mockQueryRaw = prisma.$queryRaw as jest.Mock;
const mockGroupBy  = prisma.review.groupBy as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('getTopReviewers', () => {
  it('calls $queryRaw and returns sorted reviewers with numeric fields', async () => {
    mockQueryRaw.mockResolvedValue([
      { reviewerTag: 'Alpha#1', reviewCount: BigInt(10), reputation: BigInt(25) },
      { reviewerTag: 'Beta#2',  reviewCount: BigInt(5),  reputation: BigInt(12) },
    ]);
    const result = await getTopReviewers(10);
    expect(mockQueryRaw).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].reviewerTag).toBe('Alpha#1');
    expect(result[0].reputation).toBe(25);
    expect(result[0].reviewCount).toBe(10);
  });

  it('converts BigInt values to numbers', async () => {
    mockQueryRaw.mockResolvedValue([
      { reviewerTag: 'Player#1', reviewCount: BigInt(3), reputation: BigInt(7) },
    ]);
    const result = await getTopReviewers(10);
    expect(typeof result[0].reputation).toBe('number');
    expect(typeof result[0].reviewCount).toBe('number');
  });

  it('returns empty array when no reviewers', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await getTopReviewers(10);
    expect(result).toEqual([]);
  });
});

describe('getTopGames', () => {
  it('groups helpful reviews by game and returns avg rating', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Elden Ring', _avg: { rating: 9.2 }, _count: { id: 8 } },
      { gameTitle: 'Hades',      _avg: { rating: 8.7 }, _count: { id: 5 } },
    ]);
    const result = await getTopGames(10);
    expect(mockGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['gameTitle'],
        where: { classification: 'helpful' },
        _avg: { rating: true },
        _count: { id: true },
        take: 10,
      }),
    );
    expect(result[0].gameTitle).toBe('Elden Ring');
    expect(result[0].avgRating).toBeCloseTo(9.2);
    expect(result[0].reviewCount).toBe(8);
  });

  it('rounds avgRating to one decimal place', async () => {
    mockGroupBy.mockResolvedValue([
      { gameTitle: 'Hades', _avg: { rating: 8.6667 }, _count: { id: 3 } },
    ]);
    const result = await getTopGames(10);
    expect(result[0].avgRating).toBe(8.7);
  });

  it('returns empty array when no games', async () => {
    mockGroupBy.mockResolvedValue([]);
    const result = await getTopGames(10);
    expect(result).toEqual([]);
  });
});
