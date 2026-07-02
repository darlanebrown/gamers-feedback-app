jest.mock('@/lib/prisma', () => ({
  prisma: {
    commentVote: {
      upsert:     jest.fn(),
      delete:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { upsertCommentVote, removeCommentVote, getCommentVoteCounts, getUserCommentVote } from '@/lib/commentVoteStore';
import { prisma } from '@/lib/prisma';

const mockUpsert     = (prisma.commentVote as any).upsert     as jest.Mock;
const mockDelete     = (prisma.commentVote as any).delete     as jest.Mock;
const mockFindMany   = (prisma.commentVote as any).findMany   as jest.Mock;
const mockFindUnique = (prisma.commentVote as any).findUnique as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('upsertCommentVote', () => {
  it('upserts a vote and returns the record', async () => {
    const vote = { id: 'v1', commentId: 'c1', voterTag: 'Darla#1', type: 'up', createdAt: new Date() };
    mockUpsert.mockResolvedValue(vote);

    const result = await upsertCommentVote('c1', 'Darla#1', 'up');

    expect(mockUpsert).toHaveBeenCalledWith({
      where:  { commentId_voterTag: { commentId: 'c1', voterTag: 'Darla#1' } },
      create: { commentId: 'c1', voterTag: 'Darla#1', type: 'up' },
      update: { type: 'up' },
    });
    expect(result).toEqual(vote);
  });

  it('upserts a downvote', async () => {
    const vote = { id: 'v2', commentId: 'c1', voterTag: 'Player#2', type: 'down', createdAt: new Date() };
    mockUpsert.mockResolvedValue(vote);

    const result = await upsertCommentVote('c1', 'Player#2', 'down');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ type: 'down' }) }),
    );
    expect(result.type).toBe('down');
  });
});

describe('removeCommentVote', () => {
  it('deletes the vote for the given comment and voter', async () => {
    mockDelete.mockResolvedValue({});

    await removeCommentVote('c1', 'Darla#1');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { commentId_voterTag: { commentId: 'c1', voterTag: 'Darla#1' } },
    });
  });
});

describe('getCommentVoteCounts', () => {
  it('returns up and down counts', async () => {
    mockFindMany.mockResolvedValue([
      { type: 'up' }, { type: 'up' }, { type: 'down' },
    ]);

    const result = await getCommentVoteCounts('c1');

    expect(mockFindMany).toHaveBeenCalledWith({ where: { commentId: 'c1' } });
    expect(result).toEqual({ up: 2, down: 1 });
  });

  it('returns zero counts when no votes exist', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getCommentVoteCounts('c1');

    expect(result).toEqual({ up: 0, down: 0 });
  });
});

describe('getUserCommentVote', () => {
  it('returns the vote type when the user has voted', async () => {
    mockFindUnique.mockResolvedValue({ type: 'up' });

    const result = await getUserCommentVote('c1', 'Darla#1');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { commentId_voterTag: { commentId: 'c1', voterTag: 'Darla#1' } },
    });
    expect(result).toBe('up');
  });

  it('returns null when the user has not voted', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getUserCommentVote('c1', 'Darla#1');

    expect(result).toBeNull();
  });
});
