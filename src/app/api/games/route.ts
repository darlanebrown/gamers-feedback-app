import { NextRequest, NextResponse } from 'next/server';
import { getReviewedGames } from '@/lib/gameAnalytics';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort   = searchParams.get('sort') === 'rating' ? 'rating' : 'reviews';
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '24', 10) || 24, 48);
  const offset = parseInt(searchParams.get('offset') ?? '0',  10) || 0;
  try {
    const games = await getReviewedGames({ sort, limit, offset });
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 });
  }
}
