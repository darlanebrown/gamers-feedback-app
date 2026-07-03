import { prisma } from './prisma';

export type Recommendation = {
  gameTitle: string;
  avgRating: number;
  reviewCount: number;
};

export async function getRecommendations(
  reviewerTag: string,
  limit: number,
): Promise<Recommendation[]> {
  const allReviews = await prisma.review.findMany({
    where: { classification: 'helpful' },
    select: { gameTitle: true, rating: true, reviewerTag: true, classification: true },
  });

  const helpful = allReviews.filter((r) => r.classification === 'helpful');
  const targetReviews = helpful.filter((r) => r.reviewerTag === reviewerTag);
  if (targetReviews.length === 0) return [];

  const targetGames = new Set(targetReviews.map((r) => r.gameTitle));
  const targetRatingMap = new Map(targetReviews.map((r) => [r.gameTitle, r.rating]));

  // Find reviewers whose ratings on shared games are within 2 points of the target
  const otherReviews = helpful.filter((r) => r.reviewerTag !== reviewerTag);
  const similarTags = new Set<string>();
  for (const r of otherReviews) {
    const targetRating = targetRatingMap.get(r.gameTitle);
    if (targetRating != null && Math.abs(r.rating - (targetRating as number)) <= 2) {
      similarTags.add(r.reviewerTag);
    }
  }

  if (similarTags.size === 0) return [];

  // Aggregate games loved by similar reviewers that target hasn't reviewed
  const candidateMap = new Map<string, { sum: number; count: number }>();
  for (const r of otherReviews) {
    if (!similarTags.has(r.reviewerTag)) continue;
    if (targetGames.has(r.gameTitle)) continue;
    if (r.rating < 7) continue;
    const cur = candidateMap.get(r.gameTitle) ?? { sum: 0, count: 0 };
    candidateMap.set(r.gameTitle, { sum: cur.sum + r.rating, count: cur.count + 1 });
  }

  return Array.from(candidateMap.entries())
    .map(([gameTitle, { sum, count }]) => ({
      gameTitle,
      avgRating: Math.round((sum / count) * 10) / 10,
      reviewCount: count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}
