import { prisma } from './prisma';

export type FlaggedReview = {
  reviewId:       string;
  flagCount:      number;
  gameTitle:      string;
  reviewerTag:    string;
  classification: string;
};

export async function createFlag(reviewId: string, reporterTag: string) {
  return prisma.reviewFlag.create({
    data: { reviewId, reporterTag },
  });
}

export async function getReviewFlags(reviewId: string) {
  return prisma.reviewFlag.findMany({
    where:   { reviewId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function dismissFlags(reviewId: string): Promise<number> {
  const { count } = await prisma.reviewFlag.deleteMany({ where: { reviewId } });
  return count;
}

export async function countFlags(reviewId: string): Promise<number> {
  return prisma.reviewFlag.count({ where: { reviewId } });
}

export async function getFlaggedReviews(): Promise<FlaggedReview[]> {
  const groups = await prisma.reviewFlag.groupBy({
    by:      ['reviewId'],
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  if (groups.length === 0) return [];

  const reviewIds = groups.map((g) => g.reviewId);
  const reviews = await prisma.review.findMany({
    where: { id: { in: reviewIds } },
  });

  const reviewMap = new Map(reviews.map((r) => [r.id, r]));

  return groups.map((g) => {
    const r = reviewMap.get(g.reviewId);
    return {
      reviewId:       g.reviewId,
      flagCount:      g._count.id,
      gameTitle:      r?.gameTitle      ?? '',
      reviewerTag:    r?.reviewerTag    ?? '',
      classification: r?.classification ?? '',
    };
  });
}
