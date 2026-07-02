import { prisma } from './prisma';

export async function notifyGameFollowers(
  gameTitle: string,
  reviewId: string,
  reviewerTag: string,
): Promise<void> {
  const follows = await prisma.gameFollow.findMany({
    where:  { gameTitle },
    select: { userId: true },
  });
  if (follows.length === 0) return;

  const users = await prisma.user.findMany({
    where:  { id: { in: follows.map((f) => f.userId) } },
    select: { gamerTag: true },
  });

  const tags = users.map((u) => u.gamerTag).filter((t) => t !== reviewerTag);
  if (tags.length === 0) return;

  await prisma.notification.createMany({
    data: tags.map((userTag) => ({
      userTag,
      type:      'new_game_review',
      actorTag:  reviewerTag,
      reviewId,
      gameTitle,
    })),
  });
}
