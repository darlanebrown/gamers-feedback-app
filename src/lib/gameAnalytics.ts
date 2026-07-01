import { prisma } from './prisma';

export type PlatformCount    = { platform: string; count: number };
export type RatingTrendPoint = { week: string; avgRating: number; count: number };
export type ReviewedGame     = { gameTitle: string; avgRating: number; reviewCount: number };

export type GameAnalytics = {
  gameTitle: string;
  totalReviews: number;
  helpfulCount: number;
  spamCount: number;
  toxicCount: number;
  avgRating: number;
  platformBreakdown: PlatformCount[];
  topPros: string[];
  topCons: string[];
  ratingTrend: RatingTrendPoint[];
};

function topTerms(fields: string[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const field of fields) {
    if (!field) continue;
    for (const raw of field.split(/[,\n;]+/)) {
      const term = raw.trim().toLowerCase();
      if (term.length > 2) counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

function isoWeek(date: Date): string {
  // ISO week: Monday-based. Returns "YYYY-Www". Use UTC accessors to avoid
  // timezone shifts when dates are stored as midnight UTC.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sun=0 → 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // move to Thursday of ISO week
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function buildRatingTrend(
  helpful: { rating: number; createdAt: Date }[],
): RatingTrendPoint[] {
  const weekMap = new Map<string, { sum: number; count: number }>();
  for (const r of helpful) {
    const wk = isoWeek(r.createdAt);
    const cur = weekMap.get(wk) ?? { sum: 0, count: 0 };
    weekMap.set(wk, { sum: cur.sum + r.rating, count: cur.count + 1 });
  }
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { sum, count }]) => ({
      week,
      avgRating: Math.round((sum / count) * 10) / 10,
      count,
    }));
}

export async function getGameAnalytics(gameTitle: string): Promise<GameAnalytics> {
  const rows = await prisma.review.findMany({
    where: { gameTitle: { contains: gameTitle, mode: 'insensitive' } },
    select: { platform: true, pros: true, cons: true, rating: true, classification: true, createdAt: true },
  });

  const helpful = rows.filter((r) => r.classification === 'helpful');
  const spam    = rows.filter((r) => r.classification === 'spam');
  const toxic   = rows.filter((r) => r.classification === 'toxic');

  const platformMap = new Map<string, number>();
  for (const r of helpful) {
    platformMap.set(r.platform, (platformMap.get(r.platform) ?? 0) + 1);
  }
  const platformBreakdown = Array.from(platformMap.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  const avgRating = helpful.length > 0
    ? Math.round((helpful.reduce((s, r) => s + r.rating, 0) / helpful.length) * 10) / 10
    : 0;

  return {
    gameTitle,
    totalReviews: rows.length,
    helpfulCount: helpful.length,
    spamCount:    spam.length,
    toxicCount:   toxic.length,
    avgRating,
    platformBreakdown,
    topPros:     topTerms(helpful.map((r) => r.pros)),
    topCons:     topTerms(helpful.map((r) => r.cons)),
    ratingTrend: buildRatingTrend(helpful),
  };
}

export async function getReviewedGames(opts: {
  limit: number;
  offset: number;
  sort: 'rating' | 'reviews';
}): Promise<ReviewedGame[]> {
  const orderBy = opts.sort === 'rating'
    ? { _avg: { rating: 'desc' as const } }
    : { _count: { id: 'desc' as const } };

  const groups = await prisma.review.groupBy({
    by: ['gameTitle'],
    where: { classification: 'helpful' },
    _count: { id: true },
    _avg: { rating: true },
    orderBy,
    take: opts.limit,
    skip: opts.offset,
  });

  return groups.map((g) => ({
    gameTitle:   g.gameTitle,
    reviewCount: g._count.id,
    avgRating:   Math.round((g._avg.rating ?? 0) * 10) / 10,
  }));
}
