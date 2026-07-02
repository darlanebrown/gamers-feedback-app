import { prisma } from './prisma';

export interface GameComparison {
  title:               string;
  avgRating:           number;
  reviewCount:         number;
  platforms:           string[];
  ratingDistribution:  Record<number, number>;
}

export async function compareGames(titleA: string, titleB: string): Promise<GameComparison[]> {
  return Promise.all([titleA, titleB].map((title) => buildStats(title)));
}

async function buildStats(title: string): Promise<GameComparison> {
  const reviews = await prisma.review.findMany({
    where: {
      gameTitle:      { equals: title, mode: 'insensitive' },
      classification: 'helpful',
    },
    select: { rating: true, platform: true },
  });

  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

  const platforms = Array.from(new Set(reviews.map((r) => r.platform))).sort();

  const ratingDistribution: Record<number, number> = {};
  for (const r of reviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] ?? 0) + 1;
  }

  return { title, avgRating, reviewCount, platforms, ratingDistribution };
}
