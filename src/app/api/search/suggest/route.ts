import { NextRequest, NextResponse } from 'next/server';
import { suggestGames } from '@/lib/gameService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)));
  const suggestions = await suggestGames(q, limit);
  return NextResponse.json({ suggestions });
}
