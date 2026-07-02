import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { createFlag } from '@/lib/flagStore';
import { sendFlagEmail } from '@/lib/emailService';
import { sendFlagWebhook } from '@/lib/webhookService';
import { logSecurityEvent } from '@/lib/securityLogger';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (review.reviewerTag === session.gamerTag) {
    return NextResponse.json({ error: 'Cannot flag your own review' }, { status: 400 });
  }

  try {
    await createFlag(params.id, session.gamerTag);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'You have already flagged this review' }, { status: 409 });
    }
    throw err;
  }

  logSecurityEvent('flag_submitted', session.gamerTag, params.id, `flagged review by ${review.reviewerTag}`);
  sendFlagEmail(params.id, review.gameTitle, review.reviewerTag, session.gamerTag).catch(() => {});
  sendFlagWebhook(params.id, review.gameTitle, review.reviewerTag, session.gamerTag).catch(() => {});

  return NextResponse.json({ ok: true });
}
