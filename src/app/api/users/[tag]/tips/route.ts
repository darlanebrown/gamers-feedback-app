import { NextRequest, NextResponse } from 'next/server';
import { findUserByTag }         from '@/lib/userStore';
import { getPaymentsByRecipient } from '@/lib/paymentStore';

type Params = { params: Promise<{ tag: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tag } = await params;

  const user = await findUserByTag(tag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tips = await getPaymentsByRecipient(tag);

  const tipCount   = tips.length;
  const totalCents = tips.reduce((sum, p) => sum + p.amountCents, 0);
  const totalDollars = (totalCents / 100).toFixed(2);

  const recentTippers = tips
    .slice()
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 5)
    .map((p) => p.senderTag);

  return NextResponse.json({ gamerTag: tag, tipCount, totalCents, totalDollars, recentTippers });
}
