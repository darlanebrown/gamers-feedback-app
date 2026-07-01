import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByGame, GameReviewSort } from '@/lib/reviewStore';

const VALID_SORTS = new Set<GameReviewSort>(['newest', 'highest', 'lowest']);

export async function GET(
  req: NextRequest,
  { params }: { params: { title: string } },
) {
  try {
    const raw  = new URL(req.url).searchParams.get('sort') ?? 'newest';
    const sort = VALID_SORTS.has(raw as GameReviewSort) ? (raw as GameReviewSort) : 'newest';
    const reviews = await getReviewsByGame(decodeURIComponent(params.title), sort);
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}
