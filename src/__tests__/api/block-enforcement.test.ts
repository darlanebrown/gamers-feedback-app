jest.mock('@/lib/blockStore', () => ({
  getBlockedTags: jest.fn(),
  toggleBlock:    jest.fn(),
  isBlocking:     jest.fn(),
}));

jest.mock('@/lib/followStore', () => ({
  getFollowedTags: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    review:        { findMany: jest.fn() },
    reviewComment: { findMany: jest.fn() },
    reviewVote:    { findMany: jest.fn() },
    follow:        { findMany: jest.fn() },
    user:          { findMany: jest.fn() },
  },
}));

import { getActivityFeed } from '@/lib/activityFeedService';
import { getFollowSuggestions } from '@/lib/followSuggestionsService';
import { getBlockedTags } from '@/lib/blockStore';
import { getFollowedTags } from '@/lib/followStore';
import { prisma } from '@/lib/prisma';

const mockGetBlocked  = getBlockedTags  as jest.Mock;
const mockGetFollowed = getFollowedTags as jest.Mock;
const mockReview      = prisma.review.findMany        as jest.Mock;
const mockComment     = prisma.reviewComment.findMany as jest.Mock;
const mockVote        = prisma.reviewVote.findMany    as jest.Mock;
const mockFollow      = prisma.follow.findMany        as jest.Mock;
const mockUser        = prisma.user.findMany          as jest.Mock;

const NOW = new Date().toISOString();

beforeEach(() => {
  jest.resetAllMocks();
  mockGetBlocked.mockResolvedValue([]);
  mockGetFollowed.mockResolvedValue([]);
  mockReview.mockResolvedValue([]);
  mockComment.mockResolvedValue([]);
  mockVote.mockResolvedValue([]);
  mockFollow.mockResolvedValue([]);
  mockUser.mockResolvedValue([]);
});

describe('getActivityFeed — block enforcement', () => {
  it('excludes blocked users from the activity feed query', async () => {
    mockGetFollowed.mockResolvedValue(['Bob#2', 'Eve#3']);
    mockGetBlocked.mockResolvedValue(['Eve#3']);
    mockComment.mockResolvedValue([]);
    mockVote.mockResolvedValue([]);

    await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });

    // The DB query must only include non-blocked followed tags
    const reviewCall = mockReview.mock.calls[0][0];
    expect(reviewCall.where.reviewerTag.in).toContain('Bob#2');
    expect(reviewCall.where.reviewerTag.in).not.toContain('Eve#3');
  });

  it('returns empty when all followed users are blocked', async () => {
    mockGetFollowed.mockResolvedValue(['Eve#3']);
    mockGetBlocked.mockResolvedValue(['Eve#3']);

    const items = await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });
    expect(items).toEqual([]);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('calls getBlockedTags with the caller gamerTag', async () => {
    mockGetFollowed.mockResolvedValue(['Bob#2']);
    await getActivityFeed({ gamerTag: 'Darla#1', skip: 0, take: 20 });
    expect(mockGetBlocked).toHaveBeenCalledWith('Darla#1');
  });
});

describe('getFollowSuggestions — block enforcement', () => {
  it('excludes blocked users from follow suggestions', async () => {
    mockReview.mockResolvedValueOnce([
      { gameTitle: 'Hades' },
    ]);
    mockFollow.mockResolvedValue([]);
    mockReview.mockResolvedValueOnce([
      { reviewerTag: 'Bob#2',  gameTitle: 'Hades' },
      { reviewerTag: 'Eve#3',  gameTitle: 'Hades' },
    ]);
    mockGetBlocked.mockResolvedValue(['Eve#3']);
    mockUser.mockResolvedValue([
      { gamerTag: 'Bob#2',  displayName: 'Bob' },
    ]);

    const suggestions = await getFollowSuggestions('Darla#1', 10);
    expect(suggestions.map((s) => s.gamerTag)).not.toContain('Eve#3');
    expect(suggestions.map((s) => s.gamerTag)).toContain('Bob#2');
  });

  it('calls getBlockedTags with the caller gamerTag', async () => {
    mockReview.mockResolvedValueOnce([{ gameTitle: 'Hades' }]);
    mockFollow.mockResolvedValue([]);
    mockReview.mockResolvedValueOnce([]);
    await getFollowSuggestions('Darla#1', 10);
    expect(mockGetBlocked).toHaveBeenCalledWith('Darla#1');
  });
});
