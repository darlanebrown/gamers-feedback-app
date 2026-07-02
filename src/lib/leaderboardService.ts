import { prisma } from './prisma';

export interface LeaderboardEntry {
  rank: number;
  gameTitle: string;
  avgRating: number;
  reviewCount: number;
}

export async function getGameLeaderboard({
  limit,
  minReviews,
}: {
  limit: number;
  minReviews: number;
}): Promise<LeaderboardEntry[]> {
  const groups = await prisma.review.groupBy({
    by: ['gameTitle'],
    where: { classification: 'helpful' },
    _count: { id: true },
    _avg:   { rating: true },
    having: { id: { _count: { gte: minReviews } } },
    orderBy: { _avg: { rating: 'desc' } },
    take: limit,
  });

  return groups.map((g, i) => ({
    rank:        i + 1,
    gameTitle:   g.gameTitle,
    avgRating:   Math.round((g._avg.rating ?? 0) * 10) / 10,
    reviewCount: g._count.id,
  }));
}
