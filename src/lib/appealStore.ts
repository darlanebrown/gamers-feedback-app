import { prisma } from './prisma';

export interface BanAppeal {
  id:         string;
  gamerTag:   string;
  message:    string;
  status:     string;
  reviewedAt: Date | null;
  createdAt:  Date;
}

function toAppeal(r: any): BanAppeal {
  return {
    id:         r.id,
    gamerTag:   r.gamerTag,
    message:    r.message,
    status:     r.status,
    reviewedAt: r.reviewedAt ?? null,
    createdAt:  r.createdAt,
  };
}

export async function createAppeal(gamerTag: string, message: string): Promise<BanAppeal> {
  const r = await (prisma as any).banAppeal.create({ data: { gamerTag, message } });
  return toAppeal(r);
}

export async function hasAppeal(gamerTag: string): Promise<boolean> {
  const r = await (prisma as any).banAppeal.findUnique({ where: { gamerTag } });
  return r !== null;
}

export async function getAppeals(status?: string): Promise<BanAppeal[]> {
  const rows = await (prisma as any).banAppeal.findMany({
    where:   status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toAppeal);
}

export async function getAppealById(id: string): Promise<BanAppeal | null> {
  const r = await (prisma as any).banAppeal.findUnique({ where: { id } });
  return r ? toAppeal(r) : null;
}

export async function reviewAppeal(id: string, status: 'approved' | 'denied'): Promise<BanAppeal> {
  const r = await (prisma as any).banAppeal.update({
    where: { id },
    data:  { status, reviewedAt: new Date() },
  });
  return toAppeal(r);
}
