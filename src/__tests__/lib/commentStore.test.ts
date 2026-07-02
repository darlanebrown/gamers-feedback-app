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

import { createComment, getComments, deleteComment, countComments, deleteCommentAsAdmin, countRecentCommentsByTag, updateComment } from '@/lib/commentStore';
import { prisma } from '@/lib/prisma';

const mockCreate     = (prisma.reviewComment as any).create     as jest.Mock;
const mockFindMany   = (prisma.reviewComment as any).findMany   as jest.Mock;
const mockFindUnique = (prisma.reviewComment as any).findUnique as jest.Mock;
const mockDelete     = (prisma.reviewComment as any).delete     as jest.Mock;
const mockCount      = (prisma.reviewComment as any).count      as jest.Mock;

beforeEach(() => jest.resetAllMocks());

const COMMENT = {
  id: 'c1', reviewId: 'r1', authorTag: 'Darla#1',
  body: 'Great review!', parentId: null, createdAt: '2024-01-01T00:00:00.000Z',
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
  it('returns comments ordered oldest-first with default pagination', async () => {
    const comments = [COMMENT, { ...COMMENT, id: 'c2' }];
    mockFindMany.mockResolvedValue(comments);

    const result = await getComments('r1');

    expect(mockFindMany).toHaveBeenCalledWith({
      where:   { reviewId: 'r1' },
      orderBy: { createdAt: 'asc' },
      skip:    0,
      take:    20,
    });
    expect(result).toHaveLength(2);
  });

  it('passes skip and take when provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await getComments('r1', { skip: 20, take: 10 });

    expect(mockFindMany).toHaveBeenCalledWith({
      where:   { reviewId: 'r1' },
      orderBy: { createdAt: 'asc' },
      skip:    20,
      take:    10,
    });
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

describe('deleteCommentAsAdmin', () => {
  it('deletes the comment without checking authorship', async () => {
    mockFindUnique.mockResolvedValue(COMMENT);
    mockDelete.mockResolvedValue(COMMENT);

    const result = await deleteCommentAsAdmin('c1');

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(result).toBe(true);
  });

  it('returns false when comment does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteCommentAsAdmin('c1');

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});

describe('updateComment', () => {
  it('updates the body and returns the updated comment when requester is the author', async () => {
    mockFindUnique.mockResolvedValue(COMMENT);
    const updated = { ...COMMENT, body: 'Edited body' };
    mockCreate.mockResolvedValue(updated); // reuse mockCreate as a stand-in; actual impl uses update
    // We'll verify via the real prisma.reviewComment.update call
    const mockUpdate = jest.fn().mockResolvedValue(updated);
    (prisma.reviewComment as any).update = mockUpdate;

    const result = await updateComment('c1', 'Darla#1', 'Edited body');

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data:  { body: 'Edited body' },
    });
    expect(result?.body).toBe('Edited body');
  });

  it('returns null without updating when requester is not the author', async () => {
    mockFindUnique.mockResolvedValue(COMMENT);
    const mockUpdate = jest.fn();
    (prisma.reviewComment as any).update = mockUpdate;

    const result = await updateComment('c1', 'Other#99', 'Sneaky edit');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when comment does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const mockUpdate = jest.fn();
    (prisma.reviewComment as any).update = mockUpdate;

    const result = await updateComment('c1', 'Darla#1', 'Edited body');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe('countRecentCommentsByTag', () => {
  it('counts comments by a user since a given date', async () => {
    mockCount.mockResolvedValue(4);
    const since = new Date('2024-01-01T00:00:00Z');

    const result = await countRecentCommentsByTag('Darla#1', since);

    expect(mockCount).toHaveBeenCalledWith({
      where: { authorTag: 'Darla#1', createdAt: { gte: since } },
    });
    expect(result).toBe(4);
  });

  it('returns 0 when user has no recent comments', async () => {
    mockCount.mockResolvedValue(0);
    const result = await countRecentCommentsByTag('New#1', new Date());
    expect(result).toBe(0);
  });
});
