import { prisma } from './prisma';

export interface Revision {
  id:       string;
  reviewId: string;
  headline: string;
  body:     string;
  pros:     string;
  cons:     string;
  rating:   number;
  playtime: string;
  editedAt: string;
}

export async function createRevision(
  reviewId: string,
  snapshot: {
    headline: string; body: string; pros: string;
    cons: string; rating: number; playtime: string;
  },
): Promise<void> {
  await prisma.reviewRevision.create({ data: { reviewId, ...snapshot } });
}

export async function getRevisionHistory(reviewId: string): Promise<Revision[]> {
  const rows = await prisma.reviewRevision.findMany({
    where:   { reviewId },
    orderBy: { editedAt: 'desc' },
  });
  return rows.map((r) => ({ ...r, rating: Number(r.rating), editedAt: r.editedAt.toISOString() }));
}
