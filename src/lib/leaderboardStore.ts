import { prisma } from './prisma';

export type TopReviewer = {
  reviewerTag: string;
  reviewCount: number;
  reputation: number;
};

export type TopGame = {
  gameTitle: string;
  avgRating: number;
  reviewCount: number;
};

type ReviewerRow = {
  reviewerTag: string;
  reviewCount: bigint;
  reputation: bigint;
};

export async function getTopReviewers(limit: number, since?: Date): Promise<TopReviewer[]> {
  const rows = since
    ? await prisma.$queryRaw<ReviewerRow[]>`
        SELECT r."reviewerTag",
          COUNT(DISTINCT r.id)::bigint AS "reviewCount",
          COALESCE(SUM(CASE WHEN rv.type = 'up' THEN 1 ELSE -1 END), 0)::bigint AS "reputation"
        FROM "Review" r
        LEFT JOIN "ReviewVote" rv ON rv."reviewId" = r.id
        WHERE r."createdAt" >= ${since}
        GROUP BY r."reviewerTag"
        ORDER BY "reputation" DESC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw<ReviewerRow[]>`
        SELECT r."reviewerTag",
          COUNT(DISTINCT r.id)::bigint AS "reviewCount",
          COALESCE(SUM(CASE WHEN rv.type = 'up' THEN 1 ELSE -1 END), 0)::bigint AS "reputation"
        FROM "Review" r
        LEFT JOIN "ReviewVote" rv ON rv."reviewId" = r.id
        GROUP BY r."reviewerTag"
        ORDER BY "reputation" DESC
        LIMIT ${limit}
      `;
  return rows.map((r) => ({
    reviewerTag: r.reviewerTag,
    reviewCount: Number(r.reviewCount),
    reputation:  Number(r.reputation),
  }));
}

export async function getTopGames(limit: number, since?: Date): Promise<TopGame[]> {
  const groups = await prisma.review.groupBy({
    by: ['gameTitle'],
    where: {
      classification: 'helpful',
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _avg: { rating: true },
    _count: { id: true },
    orderBy: { _avg: { rating: 'desc' } },
    take: limit,
  });
  return groups.map((g) => ({
    gameTitle:   g.gameTitle,
    avgRating:   Math.round((g._avg.rating ?? 0) * 10) / 10,
    reviewCount: g._count.id,
  }));
}
