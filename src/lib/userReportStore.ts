import { prisma } from './prisma';

export async function createUserReport(
  reporterTag: string,
  reportedTag: string,
  reason: string,
): Promise<void> {
  await prisma.userReport.create({ data: { reporterTag, reportedTag, reason } });
}

export async function hasReported(reporterTag: string, reportedTag: string): Promise<boolean> {
  const row = await prisma.userReport.findUnique({
    where: { reporterTag_reportedTag: { reporterTag, reportedTag } },
  });
  return row !== null;
}

export interface UserReport {
  id:          string;
  reporterTag: string;
  reportedTag: string;
  reason:      string;
  resolution:  string | null;
  resolvedAt:  Date | null;
  createdAt:   Date;
}

export interface GetUserReportsParams {
  reportedTag?: string;
  skip?: number;
  take?: number;
}

export async function getUserReports({
  reportedTag,
  skip = 0,
  take = 50,
}: GetUserReportsParams = {}): Promise<UserReport[]> {
  const rows = await prisma.userReport.findMany({
    where:   reportedTag ? { reportedTag } : undefined,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
  return rows.map((r) => ({
    id:          r.id,
    reporterTag: r.reporterTag,
    reportedTag: r.reportedTag,
    reason:      r.reason,
    resolution:  (r as any).resolution ?? null,
    resolvedAt:  (r as any).resolvedAt ?? null,
    createdAt:   r.createdAt,
  }));
}

export async function getReportById(id: string): Promise<UserReport | null> {
  const r = await prisma.userReport.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id:          r.id,
    reporterTag: r.reporterTag,
    reportedTag: r.reportedTag,
    reason:      r.reason,
    resolution:  (r as any).resolution ?? null,
    resolvedAt:  (r as any).resolvedAt ?? null,
    createdAt:   r.createdAt,
  };
}

export async function resolveUserReport(id: string, resolution: string): Promise<UserReport> {
  const r = await (prisma.userReport as any).update({
    where: { id },
    data:  { resolution, resolvedAt: new Date() },
  });
  return {
    id:          r.id,
    reporterTag: r.reporterTag,
    reportedTag: r.reportedTag,
    reason:      r.reason,
    resolution:  r.resolution ?? null,
    resolvedAt:  r.resolvedAt ?? null,
    createdAt:   r.createdAt,
  };
}
