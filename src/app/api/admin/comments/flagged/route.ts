import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getFlaggedComments, dismissCommentFlags } from '@/lib/commentFlagStore';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const flaggedComments = await getFlaggedComments();
  return NextResponse.json({ flaggedComments });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { commentId } = await req.json();
  if (!commentId) {
    return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
  }

  const dismissed = await dismissCommentFlags(commentId);
  return NextResponse.json({ ok: true, dismissed });
}
