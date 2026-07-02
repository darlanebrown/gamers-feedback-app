import { NextRequest, NextResponse } from 'next/server';
import { getReviewById, updateReview, deleteReview, incrementViewCount } from '@/lib/reviewStore';
import { getSession } from '@/lib/auth';

type RouteCtx = { params: { id: string } };

export async function GET(
  _req: NextRequest,
  { params }: RouteCtx,
) {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  incrementViewCount(params.id).catch(() => {});
  return NextResponse.json({ review });
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteCtx,
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fields = await req.json();
  const updated = await updateReview(params.id, session.gamerTag, fields);
  if (!updated) return NextResponse.json({ error: 'Not found or not your review' }, { status: 404 });
  return NextResponse.json({ review: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteCtx,
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const isOwner = review.reviewerTag === session.gamerTag;
  const isAdmin = session.role === 'admin';
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await deleteReview(params.id, review.reviewerTag);
  return NextResponse.json({ ok: true });
}
