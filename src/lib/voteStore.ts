import { prisma } from './prisma';

export type VoteType = 'up' | 'down';

export async function upsertVote(reviewId: string, voterTag: string, type: VoteType) {
  return prisma.reviewVote.upsert({
    where:  { reviewId_voterTag: { reviewId, voterTag } },
    create: { reviewId, voterTag, type },
    update: { type },
  });
}

export async function removeVote(reviewId: string, voterTag: string) {
  return prisma.reviewVote.delete({
    where: { reviewId_voterTag: { reviewId, voterTag } },
  });
}

export async function getVoteCounts(reviewId: string): Promise<{ up: number; down: number }> {
  const votes = await prisma.reviewVote.findMany({ where: { reviewId } });
  return {
    up:   votes.filter((v) => v.type === 'up').length,
    down: votes.filter((v) => v.type === 'down').length,
  };
}

export async function getUserVote(reviewId: string, voterTag: string): Promise<VoteType | null> {
  const vote = await prisma.reviewVote.findMany({
    where: { reviewId, voterTag },
  });
  return vote[0]?.type as VoteType | null ?? null;
}

export async function getVotesByTag(
  voterTag: string,
  opts: { skip: number; take: number; type?: VoteType },
) {
  const votes = await prisma.reviewVote.findMany({
    where:   { voterTag, ...(opts.type ? { type: opts.type } : {}) },
    orderBy: { createdAt: 'desc' },
    skip:    opts.skip,
    take:    opts.take,
  });

  if (votes.length === 0) return [];

  const reviewIds = votes.map((v) => v.reviewId);
  const reviews = await prisma.review.findMany({
    where:  { id: { in: reviewIds } },
    select: { id: true, gameTitle: true, reviewerTag: true },
  });
  const reviewMap = new Map(reviews.map((r) => [r.id, r]));

  return votes.map((v) => ({
    id:          v.id,
    reviewId:    v.reviewId,
    voterTag:    v.voterTag,
    type:        v.type,
    gameTitle:   reviewMap.get(v.reviewId)?.gameTitle   ?? '',
    reviewerTag: reviewMap.get(v.reviewId)?.reviewerTag ?? '',
    createdAt:   v.createdAt,
  }));
}
