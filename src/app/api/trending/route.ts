import { NextRequest, NextResponse } from 'next/server';
import { getTrendingGames } from '@/lib/trendingService';

export async function GET(_req: NextRequest) {
  try {
    const trending = await getTrendingGames(6, 7);
    return NextResponse.json({ trending });
  } catch {
    return NextResponse.json({ error: 'Failed to load trending games' }, { status: 500 });
  }
}
