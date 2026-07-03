import { prisma } from './prisma';
import { setFeaturedReview } from './featuredReviewStore';

export async function autoSelectFeaturedReview(): Promise<string | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const topVoted = await prisma.reviewVote.groupBy({
    by:      ['reviewId'],
    where:   { type: 'up', createdAt: { gte: since } },
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
    take:    10,
  });

  if (topVoted.length === 0) return null;

  const ids = topVoted.map((r) => r.reviewId);
  const eligible = await prisma.review.findFirst({
    where:   { id: { in: ids }, classification: 'helpful' },
    orderBy: { id: 'asc' },
  });

  if (!eligible) return null;

  // Preserve vote-rank order by selecting the highest-ranked eligible review
  const countById = new Map<string, number>(topVoted.map((r) => [r.reviewId, Number(r._count.id)]));
  const sortedEligible = await prisma.review.findMany({
    where: { id: { in: ids }, classification: 'helpful' },
  });
  const best = sortedEligible.sort(
    (a, b) => (countById.get(b.id) ?? 0) - (countById.get(a.id) ?? 0),
  )[0];

  if (!best) return null;

  await setFeaturedReview(best.id, 'cron');
  return best.id;
}
