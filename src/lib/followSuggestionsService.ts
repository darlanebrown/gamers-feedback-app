import { prisma } from './prisma';

export interface FollowSuggestion {
  gamerTag:    string;
  displayName: string | null;
  sharedGames: number;
}

export async function getFollowSuggestions(
  gamerTag: string,
  limit:    number,
): Promise<FollowSuggestion[]> {
  // Games this user has reviewed
  const myReviews = await prisma.review.findMany({
    where:  { reviewerTag: gamerTag, classification: 'helpful' },
    select: { gameTitle: true },
  });
  const myGames = myReviews.map((r) => r.gameTitle);
  if (myGames.length === 0) return [];

  // Users already followed
  const following = await prisma.follow.findMany({
    where:  { followerTag: gamerTag },
    select: { followingTag: true },
  });
  const followingSet = new Set(following.map((f) => f.followingTag));
  followingSet.add(gamerTag); // exclude self

  // Other reviewers of the same games
  const others = await prisma.review.findMany({
    where: {
      gameTitle:      { in: myGames },
      classification: 'helpful',
      reviewerTag:    { notIn: Array.from(followingSet) },
    },
    select: { reviewerTag: true, gameTitle: true },
  });

  // Count shared games per candidate
  const overlap = new Map<string, Set<string>>();
  for (const r of others) {
    if (!overlap.has(r.reviewerTag)) overlap.set(r.reviewerTag, new Set());
    overlap.get(r.reviewerTag)!.add(r.gameTitle);
  }

  const candidates = Array.from(overlap.entries())
    .map(([tag, games]) => ({ gamerTag: tag, sharedGames: games.size }))
    .sort((a, b) => b.sharedGames - a.sharedGames)
    .slice(0, limit);

  if (candidates.length === 0) return [];

  const tags = candidates.map((c) => c.gamerTag);
  const users = await prisma.user.findMany({
    where:  { gamerTag: { in: tags }, banned: false },
    select: { gamerTag: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.gamerTag, u.displayName]));

  return candidates
    .filter((c) => userMap.has(c.gamerTag))
    .map((c) => ({
      gamerTag:    c.gamerTag,
      displayName: userMap.get(c.gamerTag) ?? null,
      sharedGames: c.sharedGames,
    }));
}
