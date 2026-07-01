import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { createComment, getComments, deleteComment } from '@/lib/commentStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comments = await getComments(params.id);
  return NextResponse.json({ comments, total: comments.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { body } = await req.json();
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
  }
  if (body.length > 500) {
    return NextResponse.json({ error: 'Comment must be 500 characters or fewer' }, { status: 400 });
  }

  const comment = await createComment(params.id, session.gamerTag, body.trim());
  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId is required' }, { status: 400 });

  const deleted = await deleteComment(commentId, session.gamerTag);
  if (!deleted) return NextResponse.json({ error: 'Not found or not your comment' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
