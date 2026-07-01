jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { findSimilarReviewsById } from '@/lib/reviewStore';

const mockQueryRaw = prisma.$queryRaw as jest.Mock;

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    gameTitle: 'Hades',
    platform: 'PC',
    rating: 9,
    headline: 'Great game',
    body: 'Really enjoyed it',
    pros: 'Fun gameplay',
    cons: 'Short',
    playtime: '20 hours',
    reviewerTag: 'Player#1',
    classification: 'helpful',
    classificationReason: null,
    createdAt: new Date('2026-06-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockQueryRaw.mockResolvedValue([]);
});

describe('findSimilarReviewsById', () => {
  it('returns empty array when no similar reviews exist', async () => {
    const result = await findSimilarReviewsById('source-id', 3);
    expect(result).toEqual([]);
  });

  it('calls $queryRaw once', async () => {
    await findSimilarReviewsById('source-id', 3);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('maps raw rows to Review objects', async () => {
    mockQueryRaw.mockResolvedValue([rawRow()]);
    const result = await findSimilarReviewsById('source-id', 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'r1',
      gameTitle: 'Hades',
      rating: 9,
    });
  });

  it('converts numeric rating from raw row', async () => {
    mockQueryRaw.mockResolvedValue([rawRow({ rating: '8' })]);
    const result = await findSimilarReviewsById('source-id', 3);
    expect(typeof result[0].rating).toBe('number');
    expect(result[0].rating).toBe(8);
  });
});
