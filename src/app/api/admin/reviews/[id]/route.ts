import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getReviewById, updateReviewClassification } from '@/lib/reviewStore';
import { createNotification } from '@/lib/notificationStore';
import { findUserByTag } from '@/lib/userStore';
import { sendReclassifyEmail } from '@/lib/emailService';

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
  createNotification(
    review.reviewerTag,
    'reclassify',
    undefined,
    params.id,
    review.gameTitle,
  ).catch(() => {});
  findUserByTag(review.reviewerTag)
    .then((author) => {
      if (author) sendReclassifyEmail(author.email, review.gameTitle, classification).catch(() => {});
    })
    .catch(() => {});
  return NextResponse.json({ ok: true, id: params.id, classification });
}
