jest.mock('@/lib/prisma', () => ({
  prisma: {
    follow:     { count: jest.fn() },
    reviewVote: { count: jest.fn() },
    review:     { count: jest.fn(), findMany: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { getUserDigestData } from '@/lib/digestService';

const mockFollowCount     = prisma.follow.count     as jest.Mock;
const mockVoteCount       = prisma.reviewVote.count as jest.Mock;
const mockReviewCount     = prisma.review.count     as jest.Mock;
const mockReviewFindMany  = (prisma.review as any).findMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockReviewFindMany.mockResolvedValue([{ id: 'r1' }]);
});

describe('getUserDigestData', () => {
  it('returns new follower count, vote counts, and total reviews', async () => {
    mockFollowCount.mockResolvedValue(3);
    mockVoteCount
      .mockResolvedValueOnce(5)  // upvotes
      .mockResolvedValueOnce(2); // downvotes
    mockReviewCount.mockResolvedValue(12);

    const data = await getUserDigestData('Darla#1');

    expect(data).toEqual({
      newFollowers:  3,
      upvotes:       5,
      downvotes:     2,
      totalReviews:  12,
    });
  });

  it('queries follows created within the last 7 days', async () => {
    mockFollowCount.mockResolvedValue(0);
    mockVoteCount.mockResolvedValue(0);
    mockReviewCount.mockResolvedValue(0);

    await getUserDigestData('Darla#1');

    const followCall = mockFollowCount.mock.calls[0][0];
    expect(followCall.where.followingTag).toBe('Darla#1');
    expect(followCall.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('queries votes on the user\'s review IDs within the last 7 days', async () => {
    mockFollowCount.mockResolvedValue(0);
    mockVoteCount.mockResolvedValue(0);
    mockReviewCount.mockResolvedValue(0);

    await getUserDigestData('Darla#1');

    const upvoteCall = mockVoteCount.mock.calls[0][0];
    expect(upvoteCall.where.reviewId).toEqual({ in: ['r1'] });
    expect(upvoteCall.where.type).toBe('up');
    expect(upvoteCall.where.createdAt.gte).toBeInstanceOf(Date);
  });

  it('returns zero vote counts when user has no reviews', async () => {
    mockFollowCount.mockResolvedValue(0);
    mockVoteCount.mockResolvedValue(0);
    mockReviewCount.mockResolvedValue(0);
    mockReviewFindMany.mockResolvedValue([]);

    const data = await getUserDigestData('Ghost#00');

    expect(data).toEqual({ newFollowers: 0, upvotes: 0, downvotes: 0, totalReviews: 0 });
    expect(mockVoteCount).not.toHaveBeenCalled();
  });
});
