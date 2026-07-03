import { NextRequest, NextResponse } from 'next/server';
import { stripe }                        from '@/lib/stripeClient';
import { completePayment, getPaymentBySessionId } from '@/lib/paymentStore';
import { notifyTipReceived }             from '@/lib/tipNotificationService';

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
    const { senderTag, recipientTag } = session.metadata ?? {};

    const existing = await getPaymentBySessionId(session.id);
    if (!existing || existing.status !== 'completed') {
      await completePayment(session.id);
      notifyTipReceived(recipientTag, senderTag).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
