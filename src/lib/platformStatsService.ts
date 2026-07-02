import { prisma } from './prisma';

export interface PlatformStat {
  platform:    string;
  reviewCount: number;
  avgRating:   number;
  topGame:     string | null;
}

export async function getPlatformStats(): Promise<PlatformStat[]> {
  const groups = await prisma.review.groupBy({
    by:    ['platform'],
    where: { classification: 'helpful' },
    _count: { id: true },
    _avg:   { rating: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return Promise.all(
    groups.map(async (g) => {
      const topGameRow = await prisma.review.groupBy({
        by:    ['gameTitle'],
        where: { platform: g.platform, classification: 'helpful' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      });

      return {
        platform:    g.platform,
        reviewCount: g._count.id,
        avgRating:   Math.round((g._avg.rating ?? 0) * 10) / 10,
        topGame:     topGameRow[0]?.gameTitle ?? null,
      };
    }),
  );
}
