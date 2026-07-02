import { NextRequest, NextResponse } from 'next/server';
import { getSession }                               from '@/lib/auth';
import { getReviewsByTag }                          from '@/lib/reviewStore';
import { getFollowerCount, getFollowingCount }      from '@/lib/followStore';
import { getUnreadCount }                           from '@/lib/notificationStore';
import { getPaymentsByRecipient, getPaymentsBySender } from '@/lib/paymentStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const tag = session.gamerTag;

  const [reviews, followerCount, followingCount, unreadNotifications, received, sent] =
    await Promise.all([
      getReviewsByTag(tag),
      getFollowerCount(tag),
      getFollowingCount(tag),
      getUnreadCount(tag),
      getPaymentsByRecipient(tag),
      getPaymentsBySender(tag),
    ]);

  const sumCents = (payments: { amountCents: number }[]) =>
    payments.reduce((s, p) => s + p.amountCents, 0);

  const receivedCents = sumCents(received);
  const sentCents     = sumCents(sent);

  return NextResponse.json({
    gamerTag:           tag,
    reviewCount:        reviews.length,
    followerCount,
    followingCount,
    unreadNotifications,
    tipsReceived: {
      count:       received.length,
      totalCents:  receivedCents,
      totalDollars: (receivedCents / 100).toFixed(2),
    },
    tipsSent: {
      count:       sent.length,
      totalCents:  sentCents,
      totalDollars: (sentCents / 100).toFixed(2),
    },
  });
}
