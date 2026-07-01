jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getGamesByReviewer } from '@/lib/reviewStore';

const mockFindMany = prisma.review.findMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getGamesByReviewer', () => {
  it('returns empty array when reviewer has no reviews', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getGamesByReviewer('Ghost#99');
    expect(result).toEqual([]);
  });

  it('returns unique game titles sorted alphabetically', async () => {
    mockFindMany.mockResolvedValue([
      { gameTitle: 'Zelda' },
      { gameTitle: 'Elden Ring' },
      { gameTitle: 'Zelda' },
      { gameTitle: 'Elden Ring' },
    ]);
    const result = await getGamesByReviewer('Darla#1');
    expect(result).toEqual(['Elden Ring', 'Zelda']);
  });

  it('queries only helpful reviews for the given reviewerTag', async () => {
    mockFindMany.mockResolvedValue([]);
    await getGamesByReviewer('Darla#1');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reviewerTag: 'Darla#1', classification: 'helpful' },
        select: { gameTitle: true },
      }),
    );
  });
});
