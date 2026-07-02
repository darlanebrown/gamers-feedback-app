import { prisma } from './prisma';

export type CommunityStats = {
  users:       { total: number; banned: number };
  reviews:     { total: number; helpful: number; avgRating: string; uniqueGames: number };
  comments:    { total: number };
  votes:       { total: number };
  follows:     { total: number };
  gameFollows: { total: number };
  reactions:   { total: number };
  wishlists:   { total: number };
  collections: { total: number };
  topGame:     string | null;
  topReviewer: string | null;
};

export async function getCommunityStats(): Promise<CommunityStats> {
  const [
    totalUsers,
    bannedUsers,
    totalReviews,
    helpfulRows,
    totalComments,
    totalVotes,
    totalFollows,
    totalGameFollows,
    totalReactions,
    totalWishlists,
    totalCollections,
    topGameRows,
    topReviewerRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.review.count(),
    prisma.review.findMany({
      where:  { classification: 'helpful' },
      select: { rating: true, gameTitle: true },
    }),
    prisma.reviewComment.count(),
    prisma.reviewVote.count(),
    prisma.follow.count(),
    prisma.gameFollow.count(),
    prisma.reviewReaction.count(),
    prisma.wishlist.count(),
    prisma.collection.count(),
    prisma.review.groupBy({
      by:      ['gameTitle'],
      where:   { classification: 'helpful' },
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    1,
    }),
    prisma.review.groupBy({
      by:      ['reviewerTag'],
      where:   { classification: 'helpful' },
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    1,
    }),
  ]);

  const helpful      = helpfulRows.length;
  const uniqueGames  = new Set(helpfulRows.map((r) => r.gameTitle)).size;
  const avgRating    = helpful > 0
    ? (helpfulRows.reduce((s, r) => s + r.rating, 0) / helpful).toFixed(1)
    : '0';

  return {
    users:       { total: totalUsers, banned: bannedUsers },
    reviews:     { total: totalReviews, helpful, avgRating, uniqueGames },
    comments:    { total: totalComments },
    votes:       { total: totalVotes },
    follows:     { total: totalFollows },
    gameFollows: { total: totalGameFollows },
    reactions:   { total: totalReactions },
    wishlists:   { total: totalWishlists },
    collections: { total: totalCollections },
    topGame:     topGameRows[0]?.gameTitle     ?? null,
    topReviewer: topReviewerRows[0]?.reviewerTag ?? null,
  };
}
