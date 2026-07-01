import { prisma } from './prisma';

export type DigestData = {
  newFollowers: number;
  upvotes:      number;
  downvotes:    number;
  totalReviews: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserDigestData(gamerTag: string): Promise<DigestData> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);

  const [newFollowers, upvotes, downvotes, totalReviews] = await Promise.all([
    prisma.follow.count({
      where: { followingTag: gamerTag, createdAt: { gte: since } },
    }),
    prisma.reviewVote.count({
      where: { review: { reviewerTag: gamerTag }, type: 'up', createdAt: { gte: since } },
    }),
    prisma.reviewVote.count({
      where: { review: { reviewerTag: gamerTag }, type: 'down', createdAt: { gte: since } },
    }),
    prisma.review.count({
      where: { reviewerTag: gamerTag },
    }),
  ]);

  return { newFollowers, upvotes, downvotes, totalReviews };
}

export function hasActivity(data: DigestData): boolean {
  return data.newFollowers > 0 || data.upvotes > 0 || data.downvotes > 0;
}
