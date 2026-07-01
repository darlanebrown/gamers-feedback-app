jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewBookmark: {
      create:     jest.fn(),
      delete:     jest.fn(),
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      count:      jest.fn(),
    },
  },
}));

import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarks,
  countBookmarks,
} from '@/lib/bookmarkStore';
import { prisma } from '@/lib/prisma';

const mockCreate     = (prisma.reviewBookmark as any).create     as jest.Mock;
const mockDelete     = (prisma.reviewBookmark as any).delete     as jest.Mock;
const mockFindUnique = (prisma.reviewBookmark as any).findUnique as jest.Mock;
const mockFindMany   = (prisma.reviewBookmark as any).findMany   as jest.Mock;
const mockCount      = (prisma.reviewBookmark as any).count      as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('addBookmark', () => {
  it('creates a bookmark and returns it', async () => {
    const bm = { id: 'b1', reviewId: 'r1', bookmarkerTag: 'Darla#1', createdAt: new Date() };
    mockCreate.mockResolvedValue(bm);

    const result = await addBookmark('r1', 'Darla#1');

    expect(mockCreate).toHaveBeenCalledWith({
      data: { reviewId: 'r1', bookmarkerTag: 'Darla#1' },
    });
    expect(result).toEqual(bm);
  });
});

describe('removeBookmark', () => {
  it('deletes the bookmark for the given review and user', async () => {
    mockDelete.mockResolvedValue({ id: 'b1' });

    await removeBookmark('r1', 'Darla#1');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { reviewId_bookmarkerTag: { reviewId: 'r1', bookmarkerTag: 'Darla#1' } },
    });
  });
});

describe('isBookmarked', () => {
  it('returns true when a bookmark exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'b1' });

    const result = await isBookmarked('r1', 'Darla#1');

    expect(result).toBe(true);
  });

  it('returns false when no bookmark exists', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isBookmarked('r1', 'Darla#1');

    expect(result).toBe(false);
  });
});

describe('getBookmarks', () => {
  it('returns bookmarked reviews for a user', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'b1', reviewId: 'r1', bookmarkerTag: 'Darla#1', createdAt: new Date() },
    ]);

    const result = await getBookmarks('Darla#1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where:   { bookmarkerTag: 'Darla#1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });
});

describe('countBookmarks', () => {
  it('returns count of bookmarks for a user', async () => {
    mockCount.mockResolvedValue(3);

    const result = await countBookmarks('Darla#1');

    expect(mockCount).toHaveBeenCalledWith({ where: { bookmarkerTag: 'Darla#1' } });
    expect(result).toBe(3);
  });
});
