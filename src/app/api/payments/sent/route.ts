import { NextRequest, NextResponse } from 'next/server';
import { getSession }             from '@/lib/auth';
import { getPaymentsBySender }    from '@/lib/paymentStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const payments   = await getPaymentsBySender(session.gamerTag);
  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return NextResponse.json({ payments, total: payments.length, totalCents });
}
