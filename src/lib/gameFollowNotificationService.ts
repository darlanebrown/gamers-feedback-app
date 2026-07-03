import { prisma }            from './prisma';
import { getPreferences }    from './notificationPrefStore';
import { createNotification } from './notificationStore';

export async function notifyGameFollowers(
  gameTitle:   string,
  reviewId:    string,
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

  await Promise.all(
    tags.map(async (userTag) => {
      const prefs = await getPreferences(userTag);
      if (prefs.newGameReview) {
        await createNotification(userTag, 'new_game_review', reviewerTag, reviewId, gameTitle);
      }
    }),
  );
}
