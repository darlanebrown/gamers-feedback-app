import { prisma } from './prisma';

export async function toggleGameFollow(userId: string, gameTitle: string): Promise<boolean> {
  const existing = await prisma.gameFollow.findUnique({
    where: { userId_gameTitle: { userId, gameTitle } },
  });
  if (existing) {
    await prisma.gameFollow.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.gameFollow.create({ data: { userId, gameTitle } });
  return true;
}

export async function isFollowingGame(userId: string, gameTitle: string): Promise<boolean> {
  const row = await prisma.gameFollow.findUnique({
    where: { userId_gameTitle: { userId, gameTitle } },
  });
  return row !== null;
}

export async function getFollowedGames(userId: string): Promise<string[]> {
  const rows = await prisma.gameFollow.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { gameTitle: true },
  });
  return rows.map((r) => r.gameTitle);
}
