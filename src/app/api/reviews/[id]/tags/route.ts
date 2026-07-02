import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { addTag, getTagsForReview, VALID_TAGS } from '@/lib/reviewTagStore';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  const tags = await getTagsForReview(id);
  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  if (review.reviewerTag !== session.gamerTag)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { tag } = await req.json();
  if (!VALID_TAGS.includes(tag)) {
    return NextResponse.json(
      { error: `Invalid tag. Valid tags: ${VALID_TAGS.join(', ')}` },
      { status: 400 },
    );
  }

  await addTag(id, tag);
  const tags = await getTagsForReview(id);
  return NextResponse.json({ tags });
}
