// src/lib/reviewStore.ts
// PostgreSQL-backed store via Prisma

import { Review, ReviewClassification } from '@/types';
import { prisma } from './prisma';

function toReview(row: any): Review {
  return {
    id: row.id,
    gameTitle: row.gameTitle,
    platform: row.platform,
    rating: row.rating,
    headline: row.headline,
    body: row.body,
    pros: row.pros,
    cons: row.cons,
    playtime: row.playtime,
    reviewerTag: row.reviewerTag,
    classification: row.classification as ReviewClassification,
    classificationReason: row.classificationReason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAllReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}

export async function getHelpfulReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { classification: 'helpful' },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}

export async function getReviewsByGame(title: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: {
      gameTitle: { contains: title, mode: 'insensitive' },
      classification: 'helpful',
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}

export async function getUniqueGameTitles(): Promise<string[]> {
  const helpful = await getHelpfulReviews();
  return Array.from(new Set(helpful.map((r) => r.gameTitle))).sort();
}

export async function addReview(
  review: Omit<Review, 'id' | 'createdAt' | 'classification'>
): Promise<Review> {
  const row = await prisma.review.create({
    data: {
      gameTitle: review.gameTitle,
      platform: review.platform,
      rating: review.rating,
      headline: review.headline,
      body: review.body,
      pros: review.pros,
      cons: review.cons,
      playtime: review.playtime,
      reviewerTag: review.reviewerTag,
      classification: 'pending',
    },
  });
  return toReview(row);
}

export async function updateReviewClassification(
  id: string,
  classification: ReviewClassification,
  reason?: string
): Promise<void> {
  await prisma.review.update({
    where: { id },
    data: { classification, classificationReason: reason },
  });
}

export async function getReviewById(id: string): Promise<Review | null> {
  const row = await prisma.review.findUnique({ where: { id } });
  return row ? toReview(row) : null;
}

export async function getRecentNegativeReviewCounts(
  windowHours: number,
): Promise<{ gameTitle: string; count: number }[]> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const result = await prisma.review.groupBy({
    by: ['gameTitle'],
    where: {
      createdAt: { gte: since },
      OR: [{ rating: { lte: 4 } }, { classification: 'toxic' }],
    },
    _count: { id: true },
  });
  return result.map((r) => ({ gameTitle: r.gameTitle, count: r._count.id }));
}

export async function getReviewsByTags(reviewerTags: string[]): Promise<Review[]> {
  if (reviewerTags.length === 0) return [];
  const rows = await prisma.review.findMany({
    where: { reviewerTag: { in: reviewerTags } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}

export async function getReviewsByTag(reviewerTag: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { reviewerTag },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toReview);
}

export type SearchParams = {
  q?:             string;
  platform?:      string;
  minRating?:     number;
  maxRating?:     number;
  classification?: string;
  sort?:          'newest' | 'highest' | 'lowest' | 'most_voted';
  page?:          number;
  limit?:         number;
};

export async function searchReviews(params: SearchParams): Promise<Review[]> {
  const {
    q, platform, minRating, maxRating, classification,
    sort = 'newest', page = 1, limit = 20,
  } = params;

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { headline:    { contains: q, mode: 'insensitive' } },
      { body:        { contains: q, mode: 'insensitive' } },
      { pros:        { contains: q, mode: 'insensitive' } },
      { cons:        { contains: q, mode: 'insensitive' } },
      { gameTitle:   { contains: q, mode: 'insensitive' } },
      { reviewerTag: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (platform)      where.platform       = { equals: platform, mode: 'insensitive' };
  if (minRating)     where.rating         = { ...(where.rating as object ?? {}), gte: minRating };
  if (maxRating)     where.rating         = { ...(where.rating as object ?? {}), lte: maxRating };
  if (classification) where.classification = classification;

  const orderBy =
    sort === 'highest' ? { rating: 'desc' as const } :
    sort === 'lowest'  ? { rating: 'asc'  as const } :
                         { createdAt: 'desc' as const };

  const skip = (page - 1) * limit;

  const rows = await prisma.review.findMany({
    where,
    orderBy,
    skip,
    take: limit,
  });

  return rows.map(toReview);
}

export async function getStats() {
  const all = await getAllReviews();
  const helpful = all.filter((r) => r.classification === 'helpful');
  const spam = all.filter((r) => r.classification === 'spam');
  const toxic = all.filter((r) => r.classification === 'toxic');
  const avgRating =
    helpful.length > 0
      ? (helpful.reduce((sum, r) => sum + r.rating, 0) / helpful.length).toFixed(1)
      : '0';

  const uniqueGames = new Set(helpful.map((r) => r.gameTitle)).size;

  return {
    total: all.length,
    helpful: helpful.length,
    spam: spam.length,
    toxic: toxic.length,
    avgRating,
    uniqueGames,
  };
}

export async function getRecentReviewCountByTag(
  reviewerTag: string,
  since: Date,
): Promise<number> {
  return prisma.review.count({
    where: { reviewerTag, createdAt: { gte: since } },
  });
}

export async function storeEmbedding(id: string, embedding: number[]): Promise<void> {
  const vec = `[${embedding.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Review" SET embedding = ${vec}::vector WHERE id = ${id}`;
}

export async function findSimilarReviews(embedding: number[], limit: number): Promise<Review[]> {
  const vec = `[${embedding.join(',')}]`;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, "gameTitle", platform, rating, headline, body, pros, cons, playtime,
           "reviewerTag", classification, "classificationReason", "createdAt"
    FROM "Review"
    WHERE classification = 'helpful' AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `;
  return rows.map((row) => toReview({ ...row, rating: Number(row.rating) }));
}

export async function findSimilarReviewsById(reviewId: string, limit: number): Promise<Review[]> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, "gameTitle", platform, rating, headline, body, pros, cons, playtime,
           "reviewerTag", classification, "classificationReason", "createdAt"
    FROM "Review"
    WHERE classification = 'helpful'
      AND embedding IS NOT NULL
      AND id != ${reviewId}
    ORDER BY embedding <=> (SELECT embedding FROM "Review" WHERE id = ${reviewId})
    LIMIT ${limit}
  `;
  return rows.map((row) => toReview({ ...row, rating: Number(row.rating) }));
}
