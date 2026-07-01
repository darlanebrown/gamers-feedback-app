jest.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw:   jest.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { storeEmbedding, findSimilarReviews } from '@/lib/reviewStore';

const mockExecuteRaw = prisma.$executeRaw as unknown as jest.Mock;
const mockQueryRaw   = prisma.$queryRaw   as unknown as jest.Mock;

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    gameTitle: 'Elden Ring',
    platform: 'PC',
    rating: 9,
    headline: 'A masterpiece',
    body: 'Stunning open world.',
    pros: 'Great combat',
    cons: 'Very hard',
    playtime: '100h',
    reviewerTag: 'Gamer#1',
    classification: 'helpful',
    classificationReason: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('storeEmbedding', () => {
  it('calls $executeRaw once when storing an embedding', async () => {
    mockExecuteRaw.mockResolvedValue(1);
    await storeEmbedding('r1', [0.1, 0.2, 0.3]);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });

  it('formats the embedding as a bracketed comma-separated string', async () => {
    mockExecuteRaw.mockResolvedValue(1);
    await storeEmbedding('r2', [1, 2, 3]);
    // Tagged template call: mock.calls[0][1] is the first interpolated value (the vec string)
    expect(mockExecuteRaw.mock.calls[0][1]).toBe('[1,2,3]');
  });
});

describe('findSimilarReviews', () => {
  it('calls $queryRaw and returns mapped Review objects', async () => {
    mockQueryRaw.mockResolvedValue([rawRow()]);
    const result = await findSimilarReviews([0.1, 0.2], 5);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].gameTitle).toBe('Elden Ring');
  });

  it('correctly converts numeric fields', async () => {
    mockQueryRaw.mockResolvedValue([rawRow({ rating: 9 })]);
    const result = await findSimilarReviews([0.1], 5);
    expect(typeof result[0].rating).toBe('number');
    expect(result[0].rating).toBe(9);
  });

  it('maps createdAt Date to ISO string', async () => {
    mockQueryRaw.mockResolvedValue([rawRow()]);
    const result = await findSimilarReviews([0.1], 5);
    expect(typeof result[0].createdAt).toBe('string');
    expect(result[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns empty array when no similar reviews found', async () => {
    mockQueryRaw.mockResolvedValue([]);
    const result = await findSimilarReviews([0.1], 5);
    expect(result).toEqual([]);
  });
});
