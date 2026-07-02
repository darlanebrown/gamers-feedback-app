import { NextRequest, NextResponse } from 'next/server';
import { getSession }                from '@/lib/auth';
import { getPaymentsByRecipient }    from '@/lib/paymentStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const payments   = await getPaymentsByRecipient(session.gamerTag);
  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return NextResponse.json({ payments, total: payments.length, totalCents });
}
