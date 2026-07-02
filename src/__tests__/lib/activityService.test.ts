jest.mock('@/lib/prisma', () => ({
  prisma: {
    review:        { findMany: jest.fn() },
    reviewComment: { findMany: jest.fn() },
  },
}));

import { getUserActivity } from '@/lib/activityService';
import { prisma } from '@/lib/prisma';

const mockReviews  = prisma.review.findMany        as jest.Mock;
const mockComments = prisma.reviewComment.findMany as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('getUserActivity', () => {
  it('merges reviews and comments sorted newest-first', async () => {
    mockReviews.mockResolvedValue([
      { id: 'r1', gameTitle: 'Hades', rating: 9, headline: 'Great', classification: 'helpful',
        createdAt: new Date('2026-07-01T02:00:00Z') },
    ]);
    mockComments.mockResolvedValue([
      { id: 'c1', reviewId: 'r1', body: 'Nice!', authorTag: 'Darla#1',
        createdAt: new Date('2026-07-01T03:00:00Z') },
    ]);

    const results = await getUserActivity('Darla#1', 20);

    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('comment');   // newer
    expect(results[0].id).toBe('c1');
    expect(results[1].type).toBe('review');
    expect(results[1].id).toBe('r1');
  });

  it('limits the total results to the requested count', async () => {
    const manyReviews = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`, gameTitle: 'Game', rating: 8, headline: 'Ok',
      classification: 'helpful', createdAt: new Date(2026, 0, i + 1),
    }));
    const manyComments = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, reviewId: 'r1', body: 'Nice', authorTag: 'Darla#1',
      createdAt: new Date(2026, 0, i + 1),
    }));
    mockReviews.mockResolvedValue(manyReviews);
    mockComments.mockResolvedValue(manyComments);

    const results = await getUserActivity('Darla#1', 5);
    expect(results).toHaveLength(5);
  });

  it('returns empty array when user has no activity', async () => {
    mockReviews.mockResolvedValue([]);
    mockComments.mockResolvedValue([]);
    const results = await getUserActivity('Ghost#1', 20);
    expect(results).toEqual([]);
  });
});
