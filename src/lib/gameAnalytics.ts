import { prisma } from './prisma';

export type PlatformCount = { platform: string; count: number };

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

export async function getGameAnalytics(gameTitle: string): Promise<GameAnalytics> {
  const rows = await prisma.review.findMany({
    where: { gameTitle: { contains: gameTitle, mode: 'insensitive' } },
    select: { platform: true, pros: true, cons: true, rating: true, classification: true },
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
    topPros: topTerms(helpful.map((r) => r.pros)),
    topCons: topTerms(helpful.map((r) => r.cons)),
  };
}
