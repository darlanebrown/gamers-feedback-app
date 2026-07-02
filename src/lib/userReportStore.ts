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
    createdAt:   r.createdAt,
  }));
}
