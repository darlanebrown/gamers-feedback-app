jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  getAllReviews,
  getHelpfulReviews,
  getReviewsByGame,
  addReview,
  updateReviewClassification,
  getStats,
  getRecentReviewCountByTag,
} from '@/lib/reviewStore';

const findMany = prisma.review.findMany as jest.Mock;
const create   = prisma.review.create  as jest.Mock;
const update   = prisma.review.update  as jest.Mock;
const count    = prisma.review.count   as jest.Mock;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'id-1',
    gameTitle: 'Elden Ring',
    platform: 'PC',
    rating: 9,
    headline: 'A masterpiece',
    body: 'Stunning open world.',
    pros: 'Great combat',
    cons: 'Very hard',
    playtime: '100 hours',
    reviewerTag: 'Gamer#1234',
    classification: 'helpful',
    classificationReason: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// resetAllMocks (not clearAllMocks) also flushes mockResolvedValueOnce queues,
// preventing leaked mock values from bleeding between tests.
beforeEach(() => jest.resetAllMocks());

describe('getAllReviews', () => {
  it('queries all reviews ordered by createdAt desc', async () => {
    findMany.mockResolvedValue([row()]);
    await getAllReviews();
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });

  it('maps Prisma rows to Review objects', async () => {
    findMany.mockResolvedValue([row({ classificationReason: 'Genuine review' })]);
    const reviews = await getAllReviews();
    expect(reviews[0]).toMatchObject({
      id: 'id-1',
      gameTitle: 'Elden Ring',
      classification: 'helpful',
      classificationReason: 'Genuine review',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('converts null classificationReason to undefined', async () => {
    findMany.mockResolvedValue([row({ classificationReason: null })]);
    const reviews = await getAllReviews();
    expect(reviews[0].classificationReason).toBeUndefined();
  });
});

describe('getHelpfulReviews', () => {
  it('filters by classification: helpful', async () => {
    findMany.mockResolvedValue([]);
    await getHelpfulReviews();
    expect(findMany).toHaveBeenCalledWith({
      where: { classification: 'helpful' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getReviewsByGame', () => {
  it('does a case-insensitive contains search and filters to helpful only', async () => {
    findMany.mockResolvedValue([]);
    await getReviewsByGame('elden');
    expect(findMany).toHaveBeenCalledWith({
      where: {
        gameTitle: { contains: 'elden', mode: 'insensitive' },
        classification: 'helpful',
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('addReview', () => {
  it('creates a review with classification: pending', async () => {
    create.mockResolvedValue(row({ classification: 'pending' }));
    await addReview({
      gameTitle: 'Elden Ring',
      platform: 'PC',
      rating: 9,
      headline: 'A masterpiece',
      body: 'Stunning open world.',
      pros: 'Great combat',
      cons: 'Very hard',
      playtime: '100 hours',
      reviewerTag: 'Gamer#1234',
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ classification: 'pending' }),
    });
  });

  it('does not allow callers to override classification', async () => {
    create.mockResolvedValue(row({ classification: 'pending' }));
    await addReview({
      gameTitle: 'Test',
      platform: 'PC',
      rating: 5,
      headline: 'OK',
      body: 'Fine',
      pros: '',
      cons: '',
      playtime: '',
      reviewerTag: 'x',
    });
    const callData = create.mock.calls[0][0].data;
    expect(callData.classification).toBe('pending');
  });
});

describe('updateReviewClassification', () => {
  it('updates only classification and classificationReason', async () => {
    update.mockResolvedValue({});
    await updateReviewClassification('id-1', 'spam', 'Promotional content');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: { classification: 'spam', classificationReason: 'Promotional content' },
    });
  });

  it('omits reason when not provided', async () => {
    update.mockResolvedValue({});
    await updateReviewClassification('id-1', 'helpful');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: { classification: 'helpful', classificationReason: undefined },
    });
  });
});

describe('getStats', () => {
  it('counts helpful, spam, and toxic reviews correctly', async () => {
    findMany.mockResolvedValue([
      row({ classification: 'helpful', gameTitle: 'Elden Ring', rating: 9 }),
      row({ id: 'id-2', classification: 'helpful', gameTitle: 'Hades', rating: 8 }),
      row({ id: 'id-3', classification: 'spam', gameTitle: 'Game', rating: 3 }),
      row({ id: 'id-4', classification: 'toxic', gameTitle: 'Game', rating: 1 }),
    ]);
    const stats = await getStats();
    expect(stats.total).toBe(4);
    expect(stats.helpful).toBe(2);
    expect(stats.spam).toBe(1);
    expect(stats.toxic).toBe(1);
  });

  it('calculates avgRating from helpful reviews only', async () => {
    findMany.mockResolvedValue([
      row({ classification: 'helpful', rating: 9 }),
      row({ id: 'id-2', classification: 'helpful', rating: 7 }),
      row({ id: 'id-3', classification: 'spam', rating: 1 }),
    ]);
    const stats = await getStats();
    expect(stats.avgRating).toBe('8.0');
  });

  it('returns avgRating "0" when there are no helpful reviews', async () => {
    findMany.mockResolvedValue([row({ classification: 'spam', rating: 1 })]);
    const stats = await getStats();
    expect(stats.avgRating).toBe('0');
  });

  // BUG: getStats calls getAllReviews then getUniqueGameTitles→getHelpfulReviews,
  // resulting in 2 DB round-trips when one is enough.
  it('only queries the database once', async () => {
    findMany.mockResolvedValue([row()]);
    await getStats();
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('counts unique games from helpful reviews only', async () => {
    findMany.mockResolvedValue([
      row({ gameTitle: 'Elden Ring' }),
      row({ id: 'id-2', gameTitle: 'Elden Ring' }),
      row({ id: 'id-3', gameTitle: 'Hades' }),
      row({ id: 'id-4', classification: 'spam', gameTitle: 'Spam Game' }),
    ]);
    const stats = await getStats();
    expect(stats.uniqueGames).toBe(2);
  });
});

describe('getRecentReviewCountByTag', () => {
  it('queries by reviewerTag and createdAt >= since', async () => {
    count.mockResolvedValue(2);
    const since = new Date('2024-01-01T00:00:00.000Z');
    const result = await getRecentReviewCountByTag('Darla#1', since);
    expect(count).toHaveBeenCalledWith({
      where: { reviewerTag: 'Darla#1', createdAt: { gte: since } },
    });
    expect(result).toBe(2);
  });

  it('returns 0 when the user has no recent reviews', async () => {
    count.mockResolvedValue(0);
    const since = new Date();
    const result = await getRecentReviewCountByTag('NewUser#1', since);
    expect(result).toBe(0);
  });
});
