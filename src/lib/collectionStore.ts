import { prisma } from './prisma';

export async function createCollection(ownerTag: string, name: string) {
  return prisma.collection.create({ data: { ownerTag, name } });
}

export async function getCollections(ownerTag: string) {
  return prisma.collection.findMany({
    where:   { ownerTag },
    orderBy: { createdAt: 'asc' },
  });
}

export async function deleteCollection(id: string, requesterTag: string): Promise<boolean> {
  const col = await prisma.collection.findUnique({ where: { id } });
  if (!col || col.ownerTag !== requesterTag) return false;
  await prisma.collection.delete({ where: { id } });
  return true;
}

export async function addItemToCollection(collectionId: string, reviewId: string) {
  return prisma.collectionItem.create({ data: { collectionId, reviewId } });
}

export async function removeItemFromCollection(collectionId: string, reviewId: string) {
  return prisma.collectionItem.delete({
    where: { collectionId_reviewId: { collectionId, reviewId } },
  });
}

export async function getCollectionItems(collectionId: string): Promise<string[]> {
  const rows = await prisma.collectionItem.findMany({
    where:   { collectionId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => r.reviewId);
}
