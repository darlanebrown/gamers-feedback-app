import { prisma } from './prisma';

export async function toggleBlock(blockerTag: string, blockedTag: string): Promise<boolean> {
  const existing = await prisma.block.findUnique({
    where: { blockerTag_blockedTag: { blockerTag, blockedTag } },
  });
  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.block.create({ data: { blockerTag, blockedTag } });
  return true;
}

export async function isBlocking(blockerTag: string, blockedTag: string): Promise<boolean> {
  const row = await prisma.block.findUnique({
    where: { blockerTag_blockedTag: { blockerTag, blockedTag } },
  });
  return row !== null;
}

export async function getBlockedTags(blockerTag: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where:   { blockerTag },
    orderBy: { createdAt: 'desc' },
    select:  { blockedTag: true },
  });
  return rows.map((r) => r.blockedTag);
}
