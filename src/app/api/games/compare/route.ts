import { NextRequest, NextResponse } from 'next/server';
import { compareGames } from '@/lib/gameComparisonService';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get('a');
  const b = searchParams.get('b');

  if (!a || !b) {
    return NextResponse.json({ error: 'Both ?a and ?b game titles are required' }, { status: 400 });
  }
  if (a.toLowerCase() === b.toLowerCase()) {
    return NextResponse.json({ error: 'Game titles must be different' }, { status: 400 });
  }

  const games = await compareGames(a, b);
  return NextResponse.json({ games });
}
