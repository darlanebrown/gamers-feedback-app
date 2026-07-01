import { prisma } from './prisma';

export type Bookmark = {
  id:            string;
  reviewId:      string;
  bookmarkerTag: string;
  createdAt:     Date;
};

export async function addBookmark(reviewId: string, bookmarkerTag: string): Promise<Bookmark> {
  return prisma.reviewBookmark.create({
    data: { reviewId, bookmarkerTag },
  }) as Promise<Bookmark>;
}

export async function removeBookmark(reviewId: string, bookmarkerTag: string): Promise<void> {
  await prisma.reviewBookmark.delete({
    where: { reviewId_bookmarkerTag: { reviewId, bookmarkerTag } },
  });
}

export async function isBookmarked(reviewId: string, bookmarkerTag: string): Promise<boolean> {
  const bm = await prisma.reviewBookmark.findUnique({
    where: { reviewId_bookmarkerTag: { reviewId, bookmarkerTag } },
  });
  return bm !== null;
}

export async function getBookmarks(bookmarkerTag: string): Promise<Bookmark[]> {
  return prisma.reviewBookmark.findMany({
    where:   { bookmarkerTag },
    orderBy: { createdAt: 'desc' },
  }) as Promise<Bookmark[]>;
}

export async function countBookmarks(bookmarkerTag: string): Promise<number> {
  return prisma.reviewBookmark.count({ where: { bookmarkerTag } });
}
