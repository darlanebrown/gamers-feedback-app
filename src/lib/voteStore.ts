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
