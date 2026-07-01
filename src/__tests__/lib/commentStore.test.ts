jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewComment: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
  },
}));

import { createComment, getComments, deleteComment, countComments } from '@/lib/commentStore';
import { prisma } from '@/lib/prisma';

const mockCreate     = (prisma.reviewComment as any).create     as jest.Mock;
const mockFindMany   = (prisma.reviewComment as any).findMany   as jest.Mock;
const mockFindUnique = (prisma.reviewComment as any).findUnique as jest.Mock;
const mockDelete     = (prisma.reviewComment as any).delete     as jest.Mock;
const mockCount      = (prisma.reviewComment as any).count      as jest.Mock;

beforeEach(() => jest.resetAllMocks());

const COMMENT = {
  id: 'c1', reviewId: 'r1', authorTag: 'Darla#1',
  body: 'Great review!', createdAt: '2024-01-01T00:00:00.000Z',
};

describe('createComment', () => {
  it('creates a comment and returns it', async () => {
    mockCreate.mockResolvedValue(COMMENT);

    const result = await createComment('r1', 'Darla#1', 'Great review!');

    expect(mockCreate).toHaveBeenCalledWith({
      data: { reviewId: 'r1', authorTag: 'Darla#1', body: 'Great review!' },
    });
    expect(result).toEqual(COMMENT);
  });
});

describe('getComments', () => {
  it('returns all comments for a review ordered oldest-first', async () => {
    const comments = [COMMENT, { ...COMMENT, id: 'c2' }];
    mockFindMany.mockResolvedValue(comments);

    const result = await getComments('r1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where:   { reviewId: 'r1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
  });
});

describe('deleteComment', () => {
  it('deletes the comment and returns true when requester is the author', async () => {
    mockFindUnique.mockResolvedValue(COMMENT);
    mockDelete.mockResolvedValue(COMMENT);

    const result = await deleteComment('c1', 'Darla#1');

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(result).toBe(true);
  });

  it('returns false without deleting when requester is not the author', async () => {
    mockFindUnique.mockResolvedValue(COMMENT);

    const result = await deleteComment('c1', 'Other#99');

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('returns false when comment does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteComment('c1', 'Darla#1');

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe('countComments', () => {
  it('returns the count of comments for a review', async () => {
    mockCount.mockResolvedValue(5);

    const result = await countComments('r1');

    expect(mockCount).toHaveBeenCalledWith({ where: { reviewId: 'r1' } });
    expect(result).toBe(5);
  });
});
