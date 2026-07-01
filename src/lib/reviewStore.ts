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

export async function getReviewsByTag(reviewerTag: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { reviewerTag },
    orderBy: { createdAt: 'desc' },
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
