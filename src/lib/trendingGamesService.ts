import { prisma } from './prisma';

export type TrendingGame = {
  gameTitle:   string;
  reviewCount: number;
  avgRating:   string;
};

export async function getTrendingGames({
  days,
  limit,
}: {
  days:  number;
  limit: number;
}): Promise<TrendingGame[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const groups = await prisma.review.groupBy({
    by:      ['gameTitle'],
    where:   { classification: 'helpful', createdAt: { gte: since } },
    _count:  { id: true },
    _avg:    { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take:    limit,
  });

  return groups.map((g) => ({
    gameTitle:   g.gameTitle,
    reviewCount: g._count.id,
    avgRating:   (g._avg.rating ?? 0).toFixed(1),
  }));
}
