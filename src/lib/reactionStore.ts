import { prisma } from './prisma';

export const VALID_EMOJIS = ['🔥', '😂', '🎮', '💯', '👎'] as const;
export type ValidEmoji = (typeof VALID_EMOJIS)[number];

export async function getReactions(reviewId: string): Promise<Record<string, number>> {
  const rows = await prisma.reviewReaction.groupBy({
    by: ['emoji'],
    where: { reviewId },
    _count: { id: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.emoji] = row._count.id;
  return counts;
}

export async function toggleReaction(
  reviewId: string,
  reactorTag: string,
  emoji: string,
): Promise<void> {
  const existing = await prisma.reviewReaction.findUnique({
    where: { reviewId_reactorTag_emoji: { reviewId, reactorTag, emoji } },
  });
  if (existing) {
    await prisma.reviewReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewReaction.create({ data: { reviewId, reactorTag, emoji } });
  }
}
