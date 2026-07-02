jest.mock('@/lib/prisma', () => ({
  prisma: {
    user:          { count: jest.fn() },
    review:        { count: jest.fn() },
    reviewFlag:    { count: jest.fn() },
    reviewComment: { count: jest.fn() },
  },
}));

import { getAdminStats } from '@/lib/adminStatsService';
import { prisma } from '@/lib/prisma';

const mockUserCount    = prisma.user.count          as jest.Mock;
const mockReviewCount  = prisma.review.count        as jest.Mock;
const mockFlagCount    = prisma.reviewFlag.count    as jest.Mock;
const mockCommentCount = prisma.reviewComment.count as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('getAdminStats', () => {
  it('aggregates counts from all models in parallel', async () => {
    mockUserCount
      .mockResolvedValueOnce(120)  // total users
      .mockResolvedValueOnce(3);   // banned users
    mockReviewCount
      .mockResolvedValueOnce(450)  // total reviews
      .mockResolvedValueOnce(380)  // helpful
      .mockResolvedValueOnce(40)   // spam
      .mockResolvedValueOnce(15)   // toxic
      .mockResolvedValueOnce(15);  // pending
    mockFlagCount.mockResolvedValueOnce(7);
    mockCommentCount.mockResolvedValueOnce(890);

    const stats = await getAdminStats();

    expect(stats.users.total).toBe(120);
    expect(stats.users.banned).toBe(3);
    expect(stats.reviews.total).toBe(450);
    expect(stats.reviews.helpful).toBe(380);
    expect(stats.reviews.spam).toBe(40);
    expect(stats.reviews.toxic).toBe(15);
    expect(stats.reviews.pending).toBe(15);
    expect(stats.flags.pending).toBe(7);
    expect(stats.comments.total).toBe(890);
  });
});
