import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCommentById } from '@/lib/commentStore';
import { getCommentReactions, toggleCommentReaction, VALID_EMOJIS } from '@/lib/commentReactionStore';

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;
  const comment = await getCommentById(commentId);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const reactions = await getCommentReactions(commentId);
  return NextResponse.json({ reactions });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { commentId } = await params;
  const comment = await getCommentById(commentId);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  if (comment.authorTag === session.gamerTag) {
    return NextResponse.json({ error: 'Cannot react to your own comment' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { emoji } = body as { emoji?: string };

  if (!emoji || !(VALID_EMOJIS as readonly string[]).includes(emoji)) {
    return NextResponse.json(
      { error: `emoji must be one of: ${VALID_EMOJIS.join(' ')}` },
      { status: 400 },
    );
  }

  await toggleCommentReaction(commentId, session.gamerTag, emoji);
  const reactions = await getCommentReactions(commentId);
  return NextResponse.json({ reactions });
}
