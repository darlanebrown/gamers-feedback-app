import { NextRequest, NextResponse } from 'next/server';
import { searchReviews } from '@/lib/reviewSearchService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });

  const page     = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip     = (page - 1) * limit;
  const platform = searchParams.get('platform') ?? undefined;

  const minRatingRaw = searchParams.get('minRating');
  const maxRatingRaw = searchParams.get('maxRating');
  const minRating = minRatingRaw !== null ? parseInt(minRatingRaw, 10) : undefined;
  const maxRating = maxRatingRaw !== null ? parseInt(maxRatingRaw, 10) : undefined;

  const { reviews, total } = await searchReviews({ q, platform, minRating, maxRating, skip, take: limit });
  return NextResponse.json({ reviews, total, page, limit });
}
