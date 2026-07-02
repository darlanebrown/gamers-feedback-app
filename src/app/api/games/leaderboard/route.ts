import { NextRequest, NextResponse } from 'next/server';
import { getGameLeaderboard } from '@/lib/leaderboardService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit      = Math.min(25, Math.max(1, parseInt(searchParams.get('limit')      ?? '10', 10)));
  const minReviews = Math.max(1,              parseInt(searchParams.get('minReviews') ?? '3',  10));

  const leaderboard = await getGameLeaderboard({ limit, minReviews });
  return NextResponse.json({ leaderboard });
}
