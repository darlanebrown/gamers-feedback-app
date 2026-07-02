import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { setPinnedReview, clearPinnedReview } from '@/lib/pinnedReviewStore';

type Params = { params: Promise<{ tag: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { tag } = await params;
  if (session.gamerTag !== tag) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { reviewId } = body as { reviewId?: string | null };

  if (reviewId === null || reviewId === undefined) {
    await clearPinnedReview(tag);
    return NextResponse.json({ ok: true });
  }

  const review = await getReviewById(reviewId);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  if (review.reviewerTag !== session.gamerTag) {
    return NextResponse.json({ error: 'Cannot pin another user\'s review' }, { status: 403 });
  }

  await setPinnedReview(tag, reviewId);
  return NextResponse.json({ ok: true });
}
