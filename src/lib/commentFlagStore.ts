import { prisma } from './prisma';

export async function createCommentFlag(commentId: string, reporterTag: string) {
  return prisma.commentFlag.create({ data: { commentId, reporterTag } });
}

export async function countCommentFlags(commentId: string): Promise<number> {
  return prisma.commentFlag.count({ where: { commentId } });
}
