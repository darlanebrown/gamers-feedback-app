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
