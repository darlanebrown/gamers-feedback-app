import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { removeTag, getTagsForReview } from '@/lib/reviewTagStore';

type Params = { params: Promise<{ id: string; tag: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id, tag } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  if (review.reviewerTag !== session.gamerTag)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await removeTag(id, tag);
  const tags = await getTagsForReview(id);
  return NextResponse.json({ tags });
}
