import { prisma } from './prisma';

export interface AdminStats {
  users:    { total: number; banned: number };
  reviews:  { total: number; helpful: number; spam: number; toxic: number; pending: number };
  flags:    { pending: number };
  comments: { total: number };
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalUsers,
    bannedUsers,
    totalReviews,
    helpfulReviews,
    spamReviews,
    toxicReviews,
    pendingReviews,
    pendingFlags,
    totalComments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.review.count(),
    prisma.review.count({ where: { classification: 'helpful' } }),
    prisma.review.count({ where: { classification: 'spam' } }),
    prisma.review.count({ where: { classification: 'toxic' } }),
    prisma.review.count({ where: { classification: 'pending' } }),
    prisma.reviewFlag.count(),
    prisma.reviewComment.count(),
  ]);

  return {
    users:    { total: totalUsers,   banned: bannedUsers },
    reviews:  { total: totalReviews, helpful: helpfulReviews, spam: spamReviews, toxic: toxicReviews, pending: pendingReviews },
    flags:    { pending: pendingFlags },
    comments: { total: totalComments },
  };
}
