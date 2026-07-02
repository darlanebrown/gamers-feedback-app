import { prisma } from './prisma';

export interface Payment {
  id:              string;
  stripeSessionId: string;
  senderTag:       string;
  recipientTag:    string;
  amountCents:     number;
  status:          string;
  completedAt:     Date | null;
  createdAt:       Date;
}

export interface CreatePendingPaymentParams {
  stripeSessionId: string;
  senderTag:       string;
  recipientTag:    string;
  amountCents:     number;
}

function toPayment(r: any): Payment {
  return {
    id:              r.id,
    stripeSessionId: r.stripeSessionId,
    senderTag:       r.senderTag,
    recipientTag:    r.recipientTag,
    amountCents:     r.amountCents,
    status:          r.status,
    completedAt:     r.completedAt ?? null,
    createdAt:       r.createdAt,
  };
}

export async function createPendingPayment(params: CreatePendingPaymentParams): Promise<Payment> {
  const r = await (prisma as any).payment.create({ data: { ...params, status: 'pending' } });
  return toPayment(r);
}

export async function completePayment(stripeSessionId: string): Promise<Payment> {
  const r = await (prisma as any).payment.update({
    where: { stripeSessionId },
    data:  { status: 'completed', completedAt: new Date() },
  });
  return toPayment(r);
}

export async function getPaymentsByRecipient(recipientTag: string): Promise<Payment[]> {
  const rows = await (prisma as any).payment.findMany({
    where:   { recipientTag, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  return rows.map(toPayment);
}

export async function getPaymentsBySender(senderTag: string): Promise<Payment[]> {
  const rows = await (prisma as any).payment.findMany({
    where:   { senderTag, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  return rows.map(toPayment);
}

export async function getPaymentBySessionId(stripeSessionId: string): Promise<Payment | null> {
  const r = await (prisma as any).payment.findUnique({ where: { stripeSessionId } });
  return r ? toPayment(r) : null;
}

export interface LeaderboardEntry {
  gamerTag:    string;
  tipCount:    number;
  totalCents:  number;
}

export interface Leaderboard {
  topEarners: LeaderboardEntry[];
  topTippers: LeaderboardEntry[];
}

export async function getLeaderboard({ limit = 10 }: { limit?: number } = {}): Promise<Leaderboard> {
  const [earnerRows, tipperRows] = await Promise.all([
    (prisma as any).payment.groupBy({
      by:      ['recipientTag'],
      where:   { status: 'completed' },
      _count:  { id: true },
      _sum:    { amountCents: true },
      orderBy: { _sum: { amountCents: 'desc' } },
      take:    limit,
    }),
    (prisma as any).payment.groupBy({
      by:      ['senderTag'],
      where:   { status: 'completed' },
      _count:  { id: true },
      _sum:    { amountCents: true },
      orderBy: { _sum: { amountCents: 'desc' } },
      take:    limit,
    }),
  ]);

  const toEntry = (row: any, tagKey: string): LeaderboardEntry => ({
    gamerTag:   row[tagKey],
    tipCount:   row._count.id,
    totalCents: row._sum.amountCents ?? 0,
  });

  return {
    topEarners: earnerRows.map((r: any) => toEntry(r, 'recipientTag')),
    topTippers: tipperRows.map((r: any) => toEntry(r, 'senderTag')),
  };
}
