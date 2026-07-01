import { NextRequest, NextResponse } from 'next/server';
import { getOrFetchGame } from '@/lib/gameService';

export async function GET(
  _req: NextRequest,
  { params }: { params: { title: string } },
) {
  try {
    const game = await getOrFetchGame(params.title);
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game data' }, { status: 500 });
  }
}
