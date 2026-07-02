import { prisma } from './prisma';

export interface TrendingReview {
  id: string;
  gameTitle: string;
  platform: string;
  rating: number;
  headline: string;
  body: string;
  reviewerTag: string;
  classification: string;
  recentVotes: number;
  createdAt: Date;
}

export async function getTrendingReviews(
  limit: number,
  windowDays: number,
): Promise<TrendingReview[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const topVoted = await prisma.reviewVote.groupBy({
    by: ['reviewId'],
    where: { type: 'up', createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  if (topVoted.length === 0) return [];

  const countByReviewId = new Map(topVoted.map((r) => [r.reviewId, r._count.id]));
  const ids = topVoted.map((r) => r.reviewId);

  const reviews = await prisma.review.findMany({
    where: { id: { in: ids }, classification: 'helpful' },
  });

  return reviews
    .map((r) => ({ ...r, recentVotes: countByReviewId.get(r.id) ?? 0 }))
    .sort((a, b) => b.recentVotes - a.recentVotes);
}
