import { NextRequest, NextResponse } from 'next/server';
import { getGameStats } from '@/lib/gameStatsService';

export async function GET(
  _req: NextRequest,
  { params }: { params: { title: string } },
) {
  try {
    const stats = await getGameStats(params.title);
    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: 'Failed to load game stats' }, { status: 500 });
  }
}
