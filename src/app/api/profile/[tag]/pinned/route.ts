import { NextRequest, NextResponse } from 'next/server';
import { getPinnedReview } from '@/lib/pinnedReviewStore';

type Params = { params: Promise<{ tag: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tag } = await params;
  const review = await getPinnedReview(tag);
  if (!review) return NextResponse.json({ error: 'No pinned review' }, { status: 404 });
  return NextResponse.json({ review });
}
