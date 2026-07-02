import { prisma } from './prisma';
import { getReviewById } from './reviewStore';
import { Review } from '@/types';

export async function setPinnedReview(ownerTag: string, reviewId: string): Promise<void> {
  await prisma.pinnedReview.upsert({
    where:  { ownerTag },
    create: { ownerTag, reviewId },
    update: { reviewId },
  });
}

export async function clearPinnedReview(ownerTag: string): Promise<void> {
  await prisma.pinnedReview.deleteMany({ where: { ownerTag } });
}

export async function getPinnedReview(ownerTag: string): Promise<Review | null> {
  const record = await prisma.pinnedReview.findUnique({ where: { ownerTag } });
  if (!record) return null;
  return getReviewById(record.reviewId);
}
