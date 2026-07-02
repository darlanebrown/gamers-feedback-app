import { prisma } from './prisma';

export type ActivityItem =
  | { type: 'review';  id: string; gameTitle: string; rating: number; headline: string; classification: string; createdAt: Date }
  | { type: 'comment'; id: string; reviewId: string;  body: string;   authorTag: string; createdAt: Date };

export async function getUserActivity(gamerTag: string, limit: number): Promise<ActivityItem[]> {
  const [reviews, comments] = await Promise.all([
    prisma.review.findMany({
      where:   { reviewerTag: gamerTag, classification: 'helpful' },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select:  { id: true, gameTitle: true, rating: true, headline: true, classification: true, createdAt: true },
    }),
    prisma.reviewComment.findMany({
      where:   { authorTag: gamerTag },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select:  { id: true, reviewId: true, body: true, authorTag: true, createdAt: true },
    }),
  ]);

  const merged: ActivityItem[] = [
    ...reviews.map((r) => ({ type: 'review'  as const, ...r })),
    ...comments.map((c) => ({ type: 'comment' as const, ...c })),
  ];

  return merged
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}
