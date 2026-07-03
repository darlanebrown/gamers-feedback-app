import { prisma } from './prisma';

export interface GameStats {
  gameTitle:          string;
  reviewCount:        number;
  helpfulReviewCount: number;
  avgRating:          number;
  followerCount:      number;
  helpfulVotes:       number;
  bookmarkCount:      number;
  ratingDistribution: Record<number, number>;
}

export async function getGameStats(gameTitle: string): Promise<GameStats> {
  const reviews = await prisma.review.findMany({
    where:  { gameTitle },
    select: { id: true, rating: true, classification: true },
  });

  const reviewIds     = reviews.map((r) => r.id);
  const helpfulReviews = reviews.filter((r) => r.classification === 'helpful');

  const [followerCount, helpfulVotes, bookmarkCount] = await Promise.all([
    prisma.gameFollow.count({ where: { gameTitle } }),
    reviewIds.length === 0
      ? Promise.resolve(0)
      : prisma.reviewVote.count({ where: { type: 'helpful', reviewId: { in: reviewIds } } }),
    reviewIds.length === 0
      ? Promise.resolve(0)
      : prisma.reviewBookmark.count({ where: { reviewId: { in: reviewIds } } }),
  ]);

  const avgRating = helpfulReviews.length > 0
    ? Math.round((helpfulReviews.reduce((s, r) => s + r.rating, 0) / helpfulReviews.length) * 10) / 10
    : 0;

  const ratingDistribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) ratingDistribution[i] = 0;
  for (const r of helpfulReviews) {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] ?? 0) + 1;
  }

  return {
    gameTitle,
    reviewCount:        reviews.length,
    helpfulReviewCount: helpfulReviews.length,
    avgRating,
    followerCount,
    helpfulVotes,
    bookmarkCount,
    ratingDistribution,
  };
}
