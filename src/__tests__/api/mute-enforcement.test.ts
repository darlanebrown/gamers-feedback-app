jest.mock('@/lib/muteStore', () => ({
  getMutedTags: jest.fn(),
}));

jest.mock('@/lib/blockStore', () => ({
  getBlockedTags: jest.fn(),
}));

jest.mock('@/lib/followStore', () => ({
  getFollowedTags: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    review:        { findMany: jest.fn() },
    reviewComment: { findMany: jest.fn() },
    reviewVote:    { findMany: jest.fn() },
  },
}));

import { getActivityFeed } from '@/lib/activityFeedService';
import { getMutedTags }   from '@/lib/muteStore';
import { getBlockedTags } from '@/lib/blockStore';
import { getFollowedTags } from '@/lib/followStore';
import { prisma } from '@/lib/prisma';

const mockGetMuted   = getMutedTags   as jest.Mock;
const mockGetBlocked = getBlockedTags as jest.Mock;
const mockGetFollowed = getFollowedTags as jest.Mock;
const mockReview     = prisma.review.findMany        as jest.Mock;
const mockComment    = prisma.reviewComment.findMany as jest.Mock;
const mockVote       = prisma.reviewVote.findMany    as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetMuted.mockResolvedValue([]);
  mockGetBlocked.mockResolvedValue([]);
  mockGetFollowed.mockResolvedValue([]);
  mockReview.mockResolvedValue([]);
  mockComment.mockResolvedValue([]);
  mockVote.mockResolvedValue([]);
});

describe('getActivityFeed — mute enforcement', () => {
  it('excludes muted users from the activity feed query', async () => {
    mockGetFollowed.mockResolvedValue(['Bob#2', 'Eve#3']);
    mockGetMuted.mockResolvedValue(['Eve#3']);
    mockGetBlocked.mockResolvedValue([]);

    await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });

    const call = mockReview.mock.calls[0][0];
    expect(call.where.reviewerTag.in).toContain('Bob#2');
    expect(call.where.reviewerTag.in).not.toContain('Eve#3');
  });

  it('excludes both muted and blocked users', async () => {
    mockGetFollowed.mockResolvedValue(['Bob#2', 'Eve#3', 'Troll#4']);
    mockGetMuted.mockResolvedValue(['Eve#3']);
    mockGetBlocked.mockResolvedValue(['Troll#4']);

    await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });

    const call = mockReview.mock.calls[0][0];
    expect(call.where.reviewerTag.in).toContain('Bob#2');
    expect(call.where.reviewerTag.in).not.toContain('Eve#3');
    expect(call.where.reviewerTag.in).not.toContain('Troll#4');
  });

  it('calls getMutedTags with the caller gamerTag', async () => {
    mockGetFollowed.mockResolvedValue(['Bob#2']);
    await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });
    expect(mockGetMuted).toHaveBeenCalledWith('Darla#1');
  });

  it('returns empty when all followed users are muted or blocked', async () => {
    mockGetFollowed.mockResolvedValue(['Eve#3']);
    mockGetMuted.mockResolvedValue(['Eve#3']);

    const items = await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });
    expect(items).toEqual([]);
    expect(mockReview).not.toHaveBeenCalled();
  });
});
