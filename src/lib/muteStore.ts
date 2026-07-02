import { prisma } from './prisma';

export async function addMute(muterTag: string, mutedTag: string) {
  return prisma.mute.create({ data: { muterTag, mutedTag } });
}

export async function removeMute(muterTag: string, mutedTag: string) {
  return prisma.mute.delete({
    where: { muterTag_mutedTag: { muterTag, mutedTag } },
  });
}

export async function isMuted(muterTag: string, mutedTag: string): Promise<boolean> {
  const row = await prisma.mute.findUnique({
    where: { muterTag_mutedTag: { muterTag, mutedTag } },
  });
  return row !== null;
}

export async function getMutedTags(muterTag: string): Promise<string[]> {
  const rows = await prisma.mute.findMany({
    where:  { muterTag },
    select: { mutedTag: true },
  });
  return rows.map((r) => r.mutedTag);
}
