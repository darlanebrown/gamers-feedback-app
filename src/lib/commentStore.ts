import { prisma } from './prisma';

export type ReviewComment = {
  id:        string;
  reviewId:  string;
  authorTag: string;
  body:      string;
  createdAt: string;
};

function toComment(row: any): ReviewComment {
  return {
    id:        row.id,
    reviewId:  row.reviewId,
    authorTag: row.authorTag,
    body:      row.body,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export async function createComment(
  reviewId: string,
  authorTag: string,
  body: string,
): Promise<ReviewComment> {
  const row = await prisma.reviewComment.create({
    data: { reviewId, authorTag, body },
  });
  return toComment(row);
}

export async function getComments(
  reviewId: string,
  { skip = 0, take = 20 }: { skip?: number; take?: number } = {},
): Promise<ReviewComment[]> {
  const rows = await prisma.reviewComment.findMany({
    where:   { reviewId },
    orderBy: { createdAt: 'asc' },
    skip,
    take,
  });
  return rows.map(toComment);
}

export async function deleteComment(id: string, requesterTag: string): Promise<boolean> {
  const comment = await prisma.reviewComment.findUnique({ where: { id } });
  if (!comment || comment.authorTag !== requesterTag) return false;
  await prisma.reviewComment.delete({ where: { id } });
  return true;
}

export async function countComments(reviewId: string): Promise<number> {
  return prisma.reviewComment.count({ where: { reviewId } });
}

export async function deleteCommentAsAdmin(id: string): Promise<boolean> {
  const comment = await prisma.reviewComment.findUnique({ where: { id } });
  if (!comment) return false;
  await prisma.reviewComment.delete({ where: { id } });
  return true;
}

export async function countRecentCommentsByTag(authorTag: string, since: Date): Promise<number> {
  return prisma.reviewComment.count({
    where: { authorTag, createdAt: { gte: since } },
  });
}

export async function getCommentById(id: string): Promise<ReviewComment | null> {
  const row = await prisma.reviewComment.findUnique({ where: { id } });
  return row ? toComment(row) : null;
}

export async function updateComment(
  id: string,
  requesterTag: string,
  body: string,
): Promise<ReviewComment | null> {
  const comment = await prisma.reviewComment.findUnique({ where: { id } });
  if (!comment || comment.authorTag !== requesterTag) return null;
  const row = await prisma.reviewComment.update({
    where: { id },
    data:  { body },
  });
  return toComment(row);
}

export async function getCommentsByTag(
  authorTag: string,
  opts: { skip: number; take: number },
) {
  const comments = await prisma.reviewComment.findMany({
    where:   { authorTag },
    orderBy: { createdAt: 'desc' },
    skip:    opts.skip,
    take:    opts.take,
  });

  if (comments.length === 0) return [];

  const reviewIds = [...new Set(comments.map((c) => c.reviewId))];
  const reviews = await prisma.review.findMany({
    where:  { id: { in: reviewIds } },
    select: { id: true, gameTitle: true },
  });
  const gameMap = new Map(reviews.map((r) => [r.id, r.gameTitle]));

  return comments.map((c) => ({
    ...toComment(c),
    gameTitle: gameMap.get(c.reviewId) ?? '',
  }));
}
