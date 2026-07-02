import { NextRequest, NextResponse } from 'next/server';
import { getSession }           from '@/lib/auth';
import { findUserByTag }        from '@/lib/userStore';
import { createPendingPayment } from '@/lib/paymentStore';
import { stripe, isValidAmount } from '@/lib/stripeClient';

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { recipientTag, amountCents } = await req.json().catch(() => ({}));

  if (!recipientTag || typeof recipientTag !== 'string')
    return NextResponse.json({ error: 'recipientTag is required' }, { status: 400 });

  if (amountCents === undefined || amountCents === null)
    return NextResponse.json({ error: 'amountCents is required' }, { status: 400 });

  if (!isValidAmount(amountCents))
    return NextResponse.json(
      { error: 'amount must be one of 300, 500, 1000, 2500 cents or a custom amount ≥ 100 cents' },
      { status: 400 },
    );

  const recipient = await findUserByTag(recipientTag);
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  if (recipient.gamerTag === session.gamerTag)
    return NextResponse.json({ error: 'You cannot pay yourself' }, { status: 400 });

  const dollars = (amountCents / 100).toFixed(2);
  const checkoutSession = await stripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode:                 'payment',
    line_items: [{
      quantity:   1,
      price_data: {
        currency:     'usd',
        unit_amount:  amountCents,
        product_data: {
          name:        `🫙 Tip Jar — Support ${recipientTag}`,
          description: `Drop $${dollars} in ${recipientTag}'s tip jar on Gamers Feedback`,
          images:      [`${BASE_URL()}/tip-jar.png`],
        },
      },
    }],
    metadata: {
      senderTag:    session.gamerTag,
      recipientTag: recipient.gamerTag,
      amountCents:  String(amountCents),
    },
    success_url: `${BASE_URL()}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL()}/profile/${encodeURIComponent(recipientTag)}`,
  });

  await createPendingPayment({
    stripeSessionId: checkoutSession.id,
    senderTag:       session.gamerTag,
    recipientTag:    recipient.gamerTag,
    amountCents,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
