jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewVote: {
      upsert:   jest.fn(),
      delete:   jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { upsertVote, removeVote, getVoteCounts } from '@/lib/voteStore';
import { prisma } from '@/lib/prisma';

const mockUpsert   = prisma.reviewVote.upsert   as jest.Mock;
const mockDelete   = prisma.reviewVote.delete   as jest.Mock;
const mockFindMany = prisma.reviewVote.findMany as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('upsertVote', () => {
  it('creates or updates a vote', async () => {
    const vote = { id: 'v1', reviewId: 'r1', voterTag: 'Darla#1', type: 'up', createdAt: new Date() };
    mockUpsert.mockResolvedValue(vote);

    const result = await upsertVote('r1', 'Darla#1', 'up');

    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { reviewId_voterTag: { reviewId: 'r1', voterTag: 'Darla#1' } },
      create: { reviewId: 'r1', voterTag: 'Darla#1', type: 'up' },
      update: { type: 'up' },
    }));
    expect(result).toEqual(vote);
  });

  it('accepts downvote type', async () => {
    mockUpsert.mockResolvedValue({ type: 'down' });
    const result = await upsertVote('r1', 'Darla#1', 'down');
    expect(result.type).toBe('down');
  });
});

describe('removeVote', () => {
  it('deletes a vote by reviewId + voterTag', async () => {
    mockDelete.mockResolvedValue({});

    await removeVote('r1', 'Darla#1');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { reviewId_voterTag: { reviewId: 'r1', voterTag: 'Darla#1' } },
    });
  });
});

describe('getVoteCounts', () => {
  it('returns up and down counts for a review', async () => {
    mockFindMany.mockResolvedValue([
      { type: 'up' }, { type: 'up' }, { type: 'down' },
    ]);

    const counts = await getVoteCounts('r1');

    expect(counts).toEqual({ up: 2, down: 1 });
  });

  it('returns zeros when no votes exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const counts = await getVoteCounts('r1');
    expect(counts).toEqual({ up: 0, down: 0 });
  });
});
