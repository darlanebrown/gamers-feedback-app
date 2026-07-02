import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCommentById } from '@/lib/commentStore';
import { createCommentFlag } from '@/lib/commentFlagStore';
import { sendCommentFlagWebhook } from '@/lib/webhookService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const comment = await getCommentById(params.commentId);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  if (comment.authorTag === session.gamerTag) {
    return NextResponse.json({ error: 'Cannot flag your own comment' }, { status: 400 });
  }

  try {
    await createCommentFlag(params.commentId, session.gamerTag);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'You have already flagged this comment' }, { status: 409 });
    }
    throw err;
  }

  sendCommentFlagWebhook(params.commentId, params.id, comment.authorTag, session.gamerTag).catch(() => {});

  return NextResponse.json({ ok: true });
}
