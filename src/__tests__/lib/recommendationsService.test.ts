jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { getRecommendations } from '@/lib/recommendationsService';

const mockFindMany = prisma.review.findMany as jest.Mock;

function review(overrides: Record<string, unknown> = {}) {
  return {
    gameTitle: 'Elden Ring',
    rating: 9,
    reviewerTag: 'Player#1',
    classification: 'helpful',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockFindMany.mockResolvedValue([]);
});

describe('getRecommendations', () => {
  it('returns empty array when reviewer has no reviews', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getRecommendations('Unknown#99', 5);
    expect(result).toEqual([]);
  });

  it('returns empty array when no similar reviewers exist', async () => {
    // Only the target reviewer has reviews
    mockFindMany.mockResolvedValue([
      review({ reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9 }),
    ]);
    const result = await getRecommendations('Darla#1', 5);
    expect(result).toEqual([]);
  });

  it('recommends games reviewed by similar reviewers that target has not reviewed', async () => {
    mockFindMany.mockResolvedValue([
      // target reviewer's reviews
      review({ reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9, classification: 'helpful' }),
      // similar reviewer — also liked Elden Ring, also reviewed Hades
      review({ reviewerTag: 'Player#2', gameTitle: 'Elden Ring', rating: 8, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Hades',      rating: 9, classification: 'helpful' }),
    ]);
    const result = await getRecommendations('Darla#1', 5);
    expect(result.some((r) => r.gameTitle === 'Hades')).toBe(true);
  });

  it('does not recommend games the target has already reviewed', async () => {
    mockFindMany.mockResolvedValue([
      review({ reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Elden Ring', rating: 8, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Elden Ring', rating: 9, classification: 'helpful' }),
    ]);
    const result = await getRecommendations('Darla#1', 5);
    expect(result.every((r) => r.gameTitle !== 'Elden Ring')).toBe(true);
  });

  it('only recommends games with helpful classification', async () => {
    mockFindMany.mockResolvedValue([
      review({ reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Elden Ring', rating: 8, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Spam Game', rating: 9, classification: 'spam' }),
    ]);
    const result = await getRecommendations('Darla#1', 5);
    expect(result.every((r) => r.gameTitle !== 'Spam Game')).toBe(true);
  });

  it('result items have gameTitle, avgRating, and reviewCount fields', async () => {
    mockFindMany.mockResolvedValue([
      review({ reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', rating: 9, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Elden Ring', rating: 8, classification: 'helpful' }),
      review({ reviewerTag: 'Player#2', gameTitle: 'Hades',      rating: 9, classification: 'helpful' }),
    ]);
    const result = await getRecommendations('Darla#1', 5);
    expect(result[0]).toMatchObject({
      gameTitle:   expect.any(String),
      avgRating:   expect.any(Number),
      reviewCount: expect.any(Number),
    });
  });
});
