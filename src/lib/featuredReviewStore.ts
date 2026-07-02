import { prisma } from './prisma';
import { getReviewById } from './reviewStore';
import { Review } from '@/types';

const SINGLETON_ID = 'singleton';

export async function setFeaturedReview(reviewId: string, setBy: string): Promise<void> {
  await prisma.featuredReview.upsert({
    where:  { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, reviewId, setBy },
    update: { reviewId, setBy },
  });
}

export async function getFeaturedReview(): Promise<Review | null> {
  const record = await prisma.featuredReview.findUnique({ where: { id: SINGLETON_ID } });
  if (!record) return null;
  return getReviewById(record.reviewId);
}
