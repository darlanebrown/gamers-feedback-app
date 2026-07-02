import { prisma } from './prisma';
import { getFollowedTags } from './followStore';
import { getBlockedTags } from './blockStore';

export type ActivityItem = {
  type: 'review' | 'comment' | 'vote';
  actorTag: string;
  reviewId: string | null;
  gameTitle: string | null;
  commentId: string | null;
  createdAt: string;
};

export async function getActivityFeed({
  gamerTag,
  skip,
  take,
}: {
  gamerTag: string;
  skip: number;
  take: number;
}): Promise<ActivityItem[]> {
  const [followedTags, blockedTags] = await Promise.all([
    getFollowedTags(gamerTag),
    getBlockedTags(gamerTag),
  ]);
  const blockedSet   = new Set(blockedTags);
  const activeTags   = followedTags.filter((t) => !blockedSet.has(t));
  if (activeTags.length === 0) return [];

  const [reviews, comments, votes] = await Promise.all([
    prisma.review.findMany({
      where:   { reviewerTag: { in: activeTags } },
      select:  { id: true, reviewerTag: true, gameTitle: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take:    take + skip,
    }),
    prisma.reviewComment.findMany({
      where:   { authorTag: { in: activeTags } },
      select:  { id: true, authorTag: true, reviewId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take:    take + skip,
    }),
    prisma.reviewVote.findMany({
      where:   { voterTag: { in: activeTags } },
      select:  { id: true, voterTag: true, reviewId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take:    take + skip,
    }),
  ]);

  const items: ActivityItem[] = [
    ...reviews.map((r) => ({
      type:      'review' as const,
      actorTag:  r.reviewerTag,
      reviewId:  r.id,
      gameTitle: r.gameTitle,
      commentId: null,
      createdAt: r.createdAt.toISOString(),
    })),
    ...comments.map((c) => ({
      type:      'comment' as const,
      actorTag:  c.authorTag,
      reviewId:  c.reviewId,
      gameTitle: null,
      commentId: c.id,
      createdAt: c.createdAt.toISOString(),
    })),
    ...votes.map((v) => ({
      type:      'vote' as const,
      actorTag:  v.voterTag,
      reviewId:  v.reviewId,
      gameTitle: null,
      commentId: null,
      createdAt: v.createdAt.toISOString(),
    })),
  ];

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items.slice(skip, skip + take);
}
