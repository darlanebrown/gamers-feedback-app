import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, LeaderboardEntry } from '@/lib/paymentStore';

function withDollars(entries: LeaderboardEntry[]) {
  return entries.map((e) => ({
    ...e,
    totalDollars: (e.totalCents / 100).toFixed(2),
  }));
}

export async function GET(req: NextRequest) {
  const raw   = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10);
  const limit = Math.min(isNaN(raw) ? 10 : raw, 25);

  const { topEarners, topTippers } = await getLeaderboard({ limit });

  return NextResponse.json({
    topEarners: withDollars(topEarners),
    topTippers: withDollars(topTippers),
  });
}
