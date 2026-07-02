import { prisma } from './prisma';

export interface UserReviewStats {
  totalReviews:         number;
  helpfulReviews:       number;
  avgRatingGiven:       number;
  mostReviewedPlatform: string | null;
  gamesReviewed:        number;
}

export async function getUserReviewStats(gamerTag: string): Promise<UserReviewStats> {
  const reviews = await prisma.review.findMany({
    where:  { reviewerTag: gamerTag },
    select: { rating: true, platform: true, gameTitle: true, classification: true },
  });

  const totalReviews   = reviews.length;
  const helpfulReviews = reviews.filter((r) => r.classification === 'helpful').length;
  const avgRatingGiven =
    totalReviews > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

  const gamesReviewed = new Set(reviews.map((r) => r.gameTitle)).size;

  const platformCounts: Record<string, number> = {};
  for (const r of reviews) {
    platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + 1;
  }
  const mostReviewedPlatform =
    totalReviews > 0
      ? Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return { totalReviews, helpfulReviews, avgRatingGiven, mostReviewedPlatform, gamesReviewed };
}
