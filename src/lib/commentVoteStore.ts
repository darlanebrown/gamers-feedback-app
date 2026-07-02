import { prisma } from './prisma';

export type VoteType = 'up' | 'down';

export async function upsertCommentVote(commentId: string, voterTag: string, type: VoteType) {
  return prisma.commentVote.upsert({
    where:  { commentId_voterTag: { commentId, voterTag } },
    create: { commentId, voterTag, type },
    update: { type },
  });
}

export async function removeCommentVote(commentId: string, voterTag: string) {
  return prisma.commentVote.delete({
    where: { commentId_voterTag: { commentId, voterTag } },
  });
}

export async function getCommentVoteCounts(commentId: string): Promise<{ up: number; down: number }> {
  const votes = await prisma.commentVote.findMany({ where: { commentId } });
  return {
    up:   votes.filter((v) => v.type === 'up').length,
    down: votes.filter((v) => v.type === 'down').length,
  };
}

export async function getUserCommentVote(commentId: string, voterTag: string): Promise<VoteType | null> {
  const vote = await prisma.commentVote.findUnique({
    where: { commentId_voterTag: { commentId, voterTag } },
  });
  return (vote?.type as VoteType) ?? null;
}
