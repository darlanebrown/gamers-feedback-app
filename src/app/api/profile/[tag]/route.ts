import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByTag } from '@/lib/reviewStore';

function computeReputation(reviews: { classification: string }[]) {
  const total = reviews.length;
  if (total === 0) return { score: 0, badge: null };
  const helpful = reviews.filter((r) => r.classification === 'helpful').length;
  const score = Math.round((helpful / total) * 100);
  const badge = score >= 80 ? 'Gold' : score >= 50 ? 'Silver' : 'Bronze';
  return { score, badge };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const reviews = await getReviewsByTag(params.tag);
  const helpful = reviews.filter((r) => r.classification === 'helpful');
  const spam    = reviews.filter((r) => r.classification === 'spam');
  const toxic   = reviews.filter((r) => r.classification === 'toxic');
  const avgRating =
    helpful.length > 0
      ? helpful.reduce((sum, r) => sum + r.rating, 0) / helpful.length
      : 0;

  return NextResponse.json({
    gamerTag: params.tag,
    reviews,
    reputation: computeReputation(reviews),
    stats: {
      total: reviews.length,
      helpful: helpful.length,
      spam: spam.length,
      toxic: toxic.length,
      avgRating,
    },
  });
}
