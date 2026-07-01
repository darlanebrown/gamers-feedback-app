jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getGameAnalytics } from '@/lib/gameAnalytics';

const mockFindMany = prisma.review.findMany as jest.Mock;

function row(overrides: Record<string, unknown> = {}) {
  return {
    platform: 'PC',
    pros: 'Great combat, Nice visuals',
    cons: 'Short story',
    rating: 9,
    classification: 'helpful',
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('getGameAnalytics', () => {
  it('queries reviews case-insensitively by game title', async () => {
    mockFindMany.mockResolvedValue([]);
    await getGameAnalytics('Elden Ring');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gameTitle: expect.objectContaining({ contains: 'Elden Ring', mode: 'insensitive' }),
        }),
      }),
    );
  });

  it('counts helpful, spam, and toxic reviews', async () => {
    mockFindMany.mockResolvedValue([
      row({ classification: 'helpful' }),
      row({ classification: 'helpful' }),
      row({ classification: 'spam' }),
      row({ classification: 'toxic' }),
    ]);
    const result = await getGameAnalytics('Elden Ring');
    expect(result.helpfulCount).toBe(2);
    expect(result.spamCount).toBe(1);
    expect(result.toxicCount).toBe(1);
    expect(result.totalReviews).toBe(4);
  });

  it('computes avgRating from helpful reviews only', async () => {
    mockFindMany.mockResolvedValue([
      row({ rating: 9, classification: 'helpful' }),
      row({ rating: 7, classification: 'helpful' }),
      row({ rating: 2, classification: 'spam' }),
    ]);
    const result = await getGameAnalytics('Elden Ring');
    expect(result.avgRating).toBe(8.0);
  });

  it('builds platform breakdown sorted by count descending', async () => {
    mockFindMany.mockResolvedValue([
      row({ platform: 'PC', classification: 'helpful' }),
      row({ platform: 'PC', classification: 'helpful' }),
      row({ platform: 'PlayStation 5', classification: 'helpful' }),
      row({ platform: 'PC', classification: 'spam' }), // spam excluded
    ]);
    const result = await getGameAnalytics('Elden Ring');
    expect(result.platformBreakdown[0]).toEqual({ platform: 'PC', count: 2 });
    expect(result.platformBreakdown[1]).toEqual({ platform: 'PlayStation 5', count: 1 });
  });

  it('extracts top pros from helpful reviews', async () => {
    mockFindMany.mockResolvedValue([
      row({ pros: 'great combat, great combat, nice visuals', classification: 'helpful' }),
      row({ pros: 'great combat', classification: 'helpful' }),
    ]);
    const result = await getGameAnalytics('Elden Ring');
    expect(result.topPros[0]).toBe('great combat');
  });

  it('extracts top cons from helpful reviews', async () => {
    mockFindMany.mockResolvedValue([
      row({ cons: 'short story, short story, repetitive', classification: 'helpful' }),
      row({ cons: 'short story', classification: 'helpful' }),
    ]);
    const result = await getGameAnalytics('Elden Ring');
    expect(result.topCons[0]).toBe('short story');
  });

  it('returns zero counts and empty arrays when no reviews exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getGameAnalytics('Unknown Game');
    expect(result.totalReviews).toBe(0);
    expect(result.avgRating).toBe(0);
    expect(result.platformBreakdown).toEqual([]);
    expect(result.topPros).toEqual([]);
    expect(result.topCons).toEqual([]);
  });
});
