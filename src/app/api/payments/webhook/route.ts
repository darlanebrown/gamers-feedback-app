import { NextRequest, NextResponse } from 'next/server';
import { stripe }                        from '@/lib/stripeClient';
import { completePayment, getPaymentBySessionId } from '@/lib/paymentStore';
import { createNotification }            from '@/lib/notificationStore';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  const rawBody = await req.text();

  let event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as any;
    const { senderTag, recipientTag, amountCents } = session.metadata ?? {};

    const existing = await getPaymentBySessionId(session.id);
    if (!existing || existing.status !== 'completed') {
      await completePayment(session.id);

      const dollars = (parseInt(amountCents, 10) / 100).toFixed(2);
      createNotification({
        recipientTag,
        type:     'tip_received' as any,
        actorTag: senderTag,
        body:     `${senderTag} dropped $${dollars} in your tip jar 🫙`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
