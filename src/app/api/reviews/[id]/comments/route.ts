import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { createComment, getComments, deleteComment, countComments, countRecentCommentsByTag } from '@/lib/commentStore';
import { sendCommentEmail } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationStore';
import { findUserByTag } from '@/lib/userStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip  = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    getComments(params.id, { skip, take: limit }),
    countComments(params.id),
  ]);

  return NextResponse.json({ comments, total, page, limit });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const COMMENT_RATE_LIMIT = 10;
  const COMMENT_WINDOW_MS  = 60 * 60 * 1000;

  const since       = new Date(Date.now() - COMMENT_WINDOW_MS);
  const recentCount = await countRecentCommentsByTag(session.gamerTag, since);
  if (recentCount >= COMMENT_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 comments per hour.', retryAfter: 3600 },
      { status: 429 },
    );
  }

  const { body } = await req.json();
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
  }
  if (body.length > 500) {
    return NextResponse.json({ error: 'Comment must be 500 characters or fewer' }, { status: 400 });
  }

  const comment = await createComment(params.id, session.gamerTag, body.trim());

  if (session.gamerTag !== review.reviewerTag) {
    findUserByTag(review.reviewerTag)
      .then((author) => {
        if (author) {
          sendCommentEmail(author.email, session.gamerTag, review.gameTitle, params.id).catch(() => {});
        }
      })
      .catch(() => {});
    createNotification(review.reviewerTag, 'comment', session.gamerTag, params.id, review.gameTitle)
      .catch(() => {});
  }

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
