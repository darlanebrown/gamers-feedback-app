import { prisma } from './prisma';

export async function getWishlist(userId: string) {
  return prisma.wishlist.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addToWishlist(userId: string, gameTitle: string) {
  return prisma.wishlist.create({ data: { userId, gameTitle } });
}

export async function removeFromWishlist(userId: string, gameTitle: string): Promise<boolean> {
  const { count } = await prisma.wishlist.deleteMany({ where: { userId, gameTitle } });
  return count > 0;
}

export interface BulkAddResult {
  added:          number;
  alreadyPresent: number;
}

export async function bulkAddToWishlist(
  userId:     string,
  gameTitles: string[],
): Promise<BulkAddResult> {
  const result = await prisma.wishlist.createMany({
    data:           gameTitles.map((gameTitle) => ({ userId, gameTitle })),
    skipDuplicates: true,
  });
  return { added: result.count, alreadyPresent: gameTitles.length - result.count };
}
