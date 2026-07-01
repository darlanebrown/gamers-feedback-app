import { prisma } from './prisma';

export async function followUser(followerTag: string, followingTag: string) {
  return prisma.follow.create({ data: { followerTag, followingTag } });
}

export async function unfollowUser(followerTag: string, followingTag: string) {
  return prisma.follow.delete({
    where: { followerTag_followingTag: { followerTag, followingTag } },
  });
}

export async function isFollowing(followerTag: string, followingTag: string): Promise<boolean> {
  const record = await prisma.follow.findFirst({
    where: { followerTag, followingTag },
  });
  return record !== null;
}

export async function getFollowedTags(followerTag: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where:  { followerTag },
    select: { followingTag: true },
  });
  return rows.map((r) => r.followingTag);
}

export async function getFollowers(followingTag: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where:  { followingTag },
    select: { followerTag: true },
  });
  return rows.map((r) => r.followerTag);
}

export async function getFollowerCount(followingTag: string): Promise<number> {
  return prisma.follow.count({ where: { followingTag } });
}

export async function getFollowingCount(followerTag: string): Promise<number> {
  return prisma.follow.count({ where: { followerTag } });
}
