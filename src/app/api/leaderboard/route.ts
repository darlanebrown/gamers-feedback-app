import { NextRequest, NextResponse } from 'next/server';
import { getTopReviewers, getTopGames } from '@/lib/leaderboardStore';

const PERIOD_MS: Record<string, number> = {
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get('period') ?? 'all';
  const since  = PERIOD_MS[period] ? new Date(Date.now() - PERIOD_MS[period]) : undefined;

  try {
    const [topReviewers, topGames] = await Promise.all([
      getTopReviewers(10, since),
      getTopGames(10, since),
    ]);
    return NextResponse.json({ topReviewers, topGames, period });
  } catch {
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
