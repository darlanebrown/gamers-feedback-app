import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByGame } from '@/lib/reviewStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: { title: string } },
) {
  try {
    const reviews = await getReviewsByGame(decodeURIComponent(params.title));
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}
