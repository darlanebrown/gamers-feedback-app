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

export async function getComments(reviewId: string): Promise<ReviewComment[]> {
  const rows = await prisma.reviewComment.findMany({
    where:   { reviewId },
    orderBy: { createdAt: 'asc' },
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
