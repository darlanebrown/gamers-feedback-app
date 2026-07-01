import { prisma } from './prisma';

export type TrendingGame = {
  gameTitle: string;
  reviewCount: number;
  avgRating: number;
};

export async function getTrendingGames(limit: number, days: number): Promise<TrendingGame[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const groups = await prisma.review.groupBy({
    by: ['gameTitle'],
    where: { createdAt: { gte: cutoff } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });
  return groups.map((g) => ({
    gameTitle:   g.gameTitle,
    reviewCount: g._count.id,
    avgRating:   Math.round((g._avg.rating ?? 0) * 10) / 10,
  }));
}
