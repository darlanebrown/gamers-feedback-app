import { NextRequest, NextResponse } from 'next/server';
import { getTopReviewers, getTopGames } from '@/lib/leaderboardStore';

export async function GET(_req: NextRequest) {
  const [topReviewers, topGames] = await Promise.all([
    getTopReviewers(10),
    getTopGames(10),
  ]);
  return NextResponse.json({ topReviewers, topGames });
}
