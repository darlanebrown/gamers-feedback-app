jest.mock('@/lib/prisma', () => ({
  prisma: {
    follow: {
      findMany: jest.fn(),
    },
  },
}));

import { getFollowers, getFollowedTags } from '@/lib/followStore';
import { prisma } from '@/lib/prisma';

const mockFindMany = prisma.follow.findMany as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockFindMany.mockResolvedValue([]);
});

describe('getFollowers', () => {
  it('returns empty array when nobody follows the user', async () => {
    const result = await getFollowers('Ghost#1');
    expect(result).toEqual([]);
  });

  it('queries by followingTag and returns followerTag strings', async () => {
    mockFindMany.mockResolvedValue([
      { followerTag: 'Alice#1' },
      { followerTag: 'Bob#2' },
    ]);
    const result = await getFollowers('Darla#1');
    expect(result).toEqual(['Alice#1', 'Bob#2']);
    expect(mockFindMany).toHaveBeenCalledWith({
      where:  { followingTag: 'Darla#1' },
      select: { followerTag: true },
    });
  });
});

describe('getFollowedTags', () => {
  it('queries by followerTag and returns followingTag strings', async () => {
    mockFindMany.mockResolvedValue([
      { followingTag: 'Streamer#9' },
    ]);
    const result = await getFollowedTags('Darla#1');
    expect(result).toEqual(['Streamer#9']);
    expect(mockFindMany).toHaveBeenCalledWith({
      where:  { followerTag: 'Darla#1' },
      select: { followingTag: true },
    });
  });
});
