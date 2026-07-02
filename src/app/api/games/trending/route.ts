import { NextRequest, NextResponse } from 'next/server';
import { getTrendingGames } from '@/lib/trendingGamesService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days  = Math.min(30, Math.max(1, parseInt(searchParams.get('days')  ?? '7',  10)));
  const limit = Math.min(25, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  const games = await getTrendingGames({ days, limit });
  return NextResponse.json({ games });
}
