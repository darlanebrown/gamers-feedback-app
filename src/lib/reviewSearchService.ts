import { prisma } from './prisma';
import { Review } from '@/types';

export type SearchParams = {
  q: string;
  platform?: string;
  minRating?: number;
  maxRating?: number;
  skip: number;
  take: number;
};

export type SearchResult = {
  reviews: Review[];
  total: number;
};

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
    classification: row.classification,
    classificationReason: row.classificationReason ?? undefined,
    hasSpoilers: row.hasSpoilers ?? false,
    viewCount: row.viewCount ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function searchReviews({
  q,
  platform,
  minRating,
  maxRating,
  skip,
  take,
}: SearchParams): Promise<SearchResult> {
  const where: any = {
    classification: 'helpful',
    OR: [
      { headline: { contains: q, mode: 'insensitive' } },
      { body:     { contains: q, mode: 'insensitive' } },
      { gameTitle:{ contains: q, mode: 'insensitive' } },
    ],
  };

  if (platform)  where.platform = platform;
  if (minRating !== undefined) where.rating = { ...where.rating, gte: minRating };
  if (maxRating !== undefined) where.rating = { ...where.rating, lte: maxRating };

  const [rows, total] = await Promise.all([
    prisma.review.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.review.count({ where }),
  ]);

  return { reviews: rows.map(toReview), total };
}
