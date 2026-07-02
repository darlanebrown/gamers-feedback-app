import { NextRequest, NextResponse } from 'next/server';
import { getTrendingReviews } from '@/lib/trendingReviewsService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  const reviews = await getTrendingReviews(limit, 7);
  return NextResponse.json({ reviews });
}
