import { prisma } from './prisma';

export async function createCommentFlag(commentId: string, reporterTag: string) {
  return prisma.commentFlag.create({ data: { commentId, reporterTag } });
}

export async function countCommentFlags(commentId: string): Promise<number> {
  return prisma.commentFlag.count({ where: { commentId } });
}

export async function getFlaggedComments() {
  const groups = await prisma.commentFlag.groupBy({
    by:      ['commentId'],
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  if (groups.length === 0) return [];

  const commentIds = groups.map((g) => g.commentId);
  const comments = await prisma.reviewComment.findMany({
    where:  { id: { in: commentIds } },
    select: { id: true, body: true, authorTag: true, reviewId: true },
  }) as { id: string; body: string; authorTag: string; reviewId: string }[];
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  return groups.map((g) => {
    const c = commentMap.get(g.commentId);
    return {
      commentId:  g.commentId,
      flagCount:  g._count.id,
      body:       c?.body       ?? '',
      authorTag:  c?.authorTag  ?? '',
      reviewId:   c?.reviewId   ?? '',
    };
  });
}

export async function dismissCommentFlags(commentId: string): Promise<number> {
  const { count } = await prisma.commentFlag.deleteMany({ where: { commentId } });
  return count;
}
