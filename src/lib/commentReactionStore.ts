import { prisma } from './prisma';

export const VALID_EMOJIS = ['🔥', '😂', '🎮', '💯', '👎'] as const;

export async function getCommentReactions(commentId: string): Promise<Record<string, number>> {
  const rows = await prisma.commentReaction.groupBy({
    by:    ['emoji'],
    where: { commentId },
    _count: { id: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.emoji] = row._count.id;
  return counts;
}

export async function toggleCommentReaction(
  commentId:   string,
  reactorTag:  string,
  emoji:       string,
): Promise<void> {
  const existing = await prisma.commentReaction.findUnique({
    where: { commentId_reactorTag_emoji: { commentId, reactorTag, emoji } },
  });
  if (existing) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.commentReaction.create({ data: { commentId, reactorTag, emoji } });
  }
}
