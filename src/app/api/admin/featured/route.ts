import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { setFeaturedReview } from '@/lib/featuredReviewStore';
import { logSecurityEvent } from '@/lib/securityLogger';
import { createAuditEntry } from '@/lib/auditLogStore';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { reviewId } = body as { reviewId?: string };

  if (!reviewId || typeof reviewId !== 'string') {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
  }

  const review = await getReviewById(reviewId);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  await setFeaturedReview(reviewId, session.gamerTag);
  logSecurityEvent('admin_feature_review', { reviewId, setBy: session.gamerTag });
  createAuditEntry('admin_feature_review', session.gamerTag, reviewId, `featured by ${session.gamerTag}`).catch(() => {});

  return NextResponse.json({ ok: true, reviewId });
}
