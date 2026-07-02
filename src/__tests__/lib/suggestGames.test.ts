jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: { findMany: jest.fn() },
  },
}));

import { suggestGames } from '@/lib/gameService';
import { prisma } from '@/lib/prisma';

const mockFindMany = prisma.game.findMany as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('suggestGames', () => {
  it('queries games with case-insensitive title contains', async () => {
    mockFindMany.mockResolvedValue([
      { title: 'Hades' },
      { title: 'Hollow Knight' },
    ]);

    const results = await suggestGames('ha', 5);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { title: { contains: 'ha', mode: 'insensitive' } },
      select: { title: true },
      orderBy: { title: 'asc' },
      take: 5,
    });
    expect(results).toEqual(['Hades', 'Hollow Knight']);
  });

  it('returns empty array when no games match', async () => {
    mockFindMany.mockResolvedValue([]);
    const results = await suggestGames('zzz', 5);
    expect(results).toEqual([]);
  });

  it('respects the limit parameter', async () => {
    mockFindMany.mockResolvedValue([{ title: 'Elden Ring' }]);
    await suggestGames('el', 3);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
  });
});
