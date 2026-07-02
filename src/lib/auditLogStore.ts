import { prisma } from './prisma';

export interface AuditEntry {
  id:        string;
  action:    string;
  actorTag:  string;
  targetId:  string | null;
  detail:    string | null;
  createdAt: string;
}

export async function createAuditEntry(
  action:   string,
  actorTag: string,
  targetId?: string,
  detail?:   string,
): Promise<void> {
  await prisma.auditLog.create({
    data: { action, actorTag, targetId, detail },
  });
}

export async function getAuditLog({
  action,
  limit,
  skip,
}: {
  action?: string;
  limit:   number;
  skip:    number;
}): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where:   action ? { action } : undefined,
    orderBy: { createdAt: 'desc' },
    skip,
    take:    limit,
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
