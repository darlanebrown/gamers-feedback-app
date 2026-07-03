import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getReviewById, updateReviewClassification, deleteReviewById } from '@/lib/reviewStore';
import { notifyReclassify } from '@/lib/reclassifyNotificationService';
import { findUserByTag } from '@/lib/userStore';
import { sendReclassifyEmail } from '@/lib/emailService';
import { getSession } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/securityLogger';
import { createAuditEntry } from '@/lib/auditLogStore';

const VALID = new Set(['helpful', 'spam', 'toxic', 'pending']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { classification, reason } = await req.json();

  if (!classification || !VALID.has(classification))
    return NextResponse.json(
      { error: `classification must be one of: ${Array.from(VALID).join(', ')}` },
      { status: 400 },
    );

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  await updateReviewClassification(params.id, classification, reason ?? 'Admin override');
  notifyReclassify(review.reviewerTag, params.id, review.gameTitle).catch(() => {});
  findUserByTag(review.reviewerTag)
    .then((author) => {
      if (author) sendReclassifyEmail(author.email, review.gameTitle, classification).catch(() => {});
    })
    .catch(() => {});
  return NextResponse.json({ ok: true, id: params.id, classification });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  await deleteReviewById(params.id);

  const session = await getSession(req);
  const actor   = session?.gamerTag ?? 'unknown';
  const detail  = `deleted review by ${review.reviewerTag}`;
  logSecurityEvent('admin_review_delete', actor, params.id, detail);
  createAuditEntry('admin_review_delete', actor, params.id, detail).catch(() => {});

  return NextResponse.json({ ok: true });
}
