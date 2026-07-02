import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { getReactions, toggleReaction, VALID_EMOJIS } from '@/lib/reactionStore';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  const reactions = await getReactions(id);
  return NextResponse.json({ reactions });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  if (review.reviewerTag === session.gamerTag) {
    return NextResponse.json({ error: 'Cannot react to your own review' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { emoji } = body as { emoji?: string };

  if (!emoji || !(VALID_EMOJIS as readonly string[]).includes(emoji)) {
    return NextResponse.json(
      { error: `emoji must be one of: ${VALID_EMOJIS.join(' ')}` },
      { status: 400 },
    );
  }

  await toggleReaction(id, session.gamerTag, emoji);
  const reactions = await getReactions(id);
  return NextResponse.json({ reactions });
}
