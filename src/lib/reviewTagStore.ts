import { prisma } from './prisma';
import { Review } from '@/types';

export const VALID_TAGS = [
  'rpg', 'indie', 'multiplayer', 'singleplayer',
  'action', 'strategy', 'horror', 'puzzle',
] as const;

function toReview(row: any): Review {
  return {
    id: row.id, gameTitle: row.gameTitle, platform: row.platform,
    rating: row.rating, headline: row.headline, body: row.body,
    pros: row.pros, cons: row.cons, playtime: row.playtime,
    reviewerTag: row.reviewerTag, classification: row.classification,
    classificationReason: row.classificationReason ?? undefined,
    hasSpoilers: row.hasSpoilers ?? false, viewCount: row.viewCount ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function addTag(reviewId: string, tag: string): Promise<void> {
  await prisma.reviewTag.upsert({
    where:  { reviewId_tag: { reviewId, tag } },
    update: {},
    create: { reviewId, tag },
  });
}

export async function removeTag(reviewId: string, tag: string): Promise<void> {
  await prisma.reviewTag.deleteMany({ where: { reviewId, tag } });
}

export async function getTagsForReview(reviewId: string): Promise<string[]> {
  const rows = await prisma.reviewTag.findMany({
    where:   { reviewId },
    orderBy: { createdAt: 'asc' },
    select:  { tag: true },
  });
  return rows.map((r) => r.tag);
}

export async function getReviewsByTag(tag: string): Promise<Review[]> {
  const tagRows = await prisma.reviewTag.findMany({
    where:  { tag },
    select: { reviewId: true },
  });
  const ids = tagRows.map((r) => r.reviewId);
  if (ids.length === 0) return [];
  const rows = await prisma.review.findMany({
    where:   { id: { in: ids }, classification: 'helpful' },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}
