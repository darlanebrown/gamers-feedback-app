jest.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

import { getReviewsByGame } from '@/lib/reviewStore';
import { prisma } from '@/lib/prisma';

const mockFindMany = prisma.review.findMany as jest.Mock;

const WHERE = {
  gameTitle: { contains: 'Hades', mode: 'insensitive' },
  classification: 'helpful',
};

beforeEach(() => {
  jest.resetAllMocks();
  mockFindMany.mockResolvedValue([]);
});

describe('getReviewsByGame — sort param', () => {
  it('defaults to newest (createdAt desc) when no sort given', async () => {
    await getReviewsByGame('Hades');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: WHERE,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('sort=newest uses createdAt desc', async () => {
    await getReviewsByGame('Hades', 'newest');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: WHERE,
      orderBy: { createdAt: 'desc' },
    });
  });

  it('sort=highest uses rating desc', async () => {
    await getReviewsByGame('Hades', 'highest');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: WHERE,
      orderBy: { rating: 'desc' },
    });
  });

  it('sort=lowest uses rating asc', async () => {
    await getReviewsByGame('Hades', 'lowest');
    expect(mockFindMany).toHaveBeenCalledWith({
      where: WHERE,
      orderBy: { rating: 'asc' },
    });
  });
});
