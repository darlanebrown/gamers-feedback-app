import { NextRequest, NextResponse } from 'next/server';
import { searchReviews, countReviews } from '@/lib/reviewStore';

const VALID_SORTS = new Set(['newest', 'highest', 'lowest', 'most_voted']);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const sort = searchParams.get('sort') ?? 'newest';
  if (!VALID_SORTS.has(sort))
    return NextResponse.json(
      { error: `sort must be one of: ${Array.from(VALID_SORTS).join(', ')}` },
      { status: 400 },
    );

  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  const rawMin = searchParams.get('minRating');
  const rawMax = searchParams.get('maxRating');
  const minRating = rawMin ? parseInt(rawMin, 10) : undefined;
  const maxRating = rawMax ? parseInt(rawMax, 10) : undefined;

  const searchParams2 = {
    q:              searchParams.get('q')              ?? undefined,
    platform:       searchParams.get('platform')       ?? undefined,
    classification: searchParams.get('classification') ?? undefined,
    minRating,
    maxRating,
    sort:           sort as 'newest' | 'highest' | 'lowest' | 'most_voted',
  };

  const [reviews, total] = await Promise.all([
    searchReviews({ ...searchParams2, page, limit }),
    countReviews(searchParams2),
  ]);

  return NextResponse.json({ reviews, total, page, limit });
}
