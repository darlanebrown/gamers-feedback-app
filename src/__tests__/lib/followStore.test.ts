jest.mock('@/lib/prisma', () => ({
  prisma: {
    follow: {
      create:    jest.fn(),
      delete:    jest.fn(),
      findFirst: jest.fn(),
      findMany:  jest.fn(),
      count:     jest.fn(),
    },
  },
}));

import { followUser, unfollowUser, isFollowing, getFollowedTags, getFollowerCount, getFollowingCount } from '@/lib/followStore';
import { prisma } from '@/lib/prisma';

const mockCreate    = prisma.follow.create    as jest.Mock;
const mockDelete    = prisma.follow.delete    as jest.Mock;
const mockFindFirst = prisma.follow.findFirst as jest.Mock;
const mockFindMany  = prisma.follow.findMany  as jest.Mock;
const mockCount     = prisma.follow.count     as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('followUser', () => {
  it('creates a follow record', async () => {
    const record = { id: 'f1', followerTag: 'Darla#1', followingTag: 'Player#99', createdAt: new Date() };
    mockCreate.mockResolvedValue(record);

    const result = await followUser('Darla#1', 'Player#99');

    expect(mockCreate).toHaveBeenCalledWith({
      data: { followerTag: 'Darla#1', followingTag: 'Player#99' },
    });
    expect(result).toEqual(record);
  });
});

describe('unfollowUser', () => {
  it('deletes a follow record', async () => {
    mockDelete.mockResolvedValue({});

    await unfollowUser('Darla#1', 'Player#99');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { followerTag_followingTag: { followerTag: 'Darla#1', followingTag: 'Player#99' } },
    });
  });
});

describe('isFollowing', () => {
  it('returns true when a follow record exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'f1' });
    expect(await isFollowing('Darla#1', 'Player#99')).toBe(true);
  });

  it('returns false when no follow record exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    expect(await isFollowing('Darla#1', 'Player#99')).toBe(false);
  });
});

describe('getFollowedTags', () => {
  it('returns list of tags the user follows', async () => {
    mockFindMany.mockResolvedValue([
      { followingTag: 'Player#99' },
      { followingTag: 'Gamer#42' },
    ]);

    const tags = await getFollowedTags('Darla#1');

    expect(tags).toEqual(['Player#99', 'Gamer#42']);
  });

  it('returns empty array when following no one', async () => {
    mockFindMany.mockResolvedValue([]);
    expect(await getFollowedTags('Darla#1')).toEqual([]);
  });
});

describe('getFollowerCount', () => {
  it('returns the number of followers', async () => {
    mockCount.mockResolvedValue(5);
    expect(await getFollowerCount('Player#99')).toBe(5);
  });
});

describe('getFollowingCount', () => {
  it('returns the number of users being followed', async () => {
    mockCount.mockResolvedValue(3);
    expect(await getFollowingCount('Darla#1')).toBe(3);
  });
});
