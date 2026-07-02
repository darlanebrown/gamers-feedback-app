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
