jest.mock('@/lib/userReviewStatsService', () => ({
  getUserReviewStats: jest.fn(),
}));

jest.mock('@/lib/userStore', () => ({
  getUserByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/stats/route';
import { getUserReviewStats } from '@/lib/userReviewStatsService';
import { getUserByTag } from '@/lib/userStore';

const mockGetStats   = getUserReviewStats as jest.Mock;
const mockGetUserByTag = getUserByTag     as jest.Mock;

const SAMPLE_USER  = { id: 'u1', gamerTag: 'Darla#1', banned: false };

const SAMPLE_STATS = {
  totalReviews:         12,
  helpfulReviews:       8,
  avgRatingGiven:       7.4,
  mostReviewedPlatform: 'PC',
  gamesReviewed:        10,
};

function makeReq(tag: string) {
  return new NextRequest(
    `http://localhost/api/profile/${encodeURIComponent(tag)}/stats`,
  );
}

function makeParams(tag: string) {
  return Promise.resolve({ tag });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetStats.mockResolvedValue(SAMPLE_STATS);
});

describe('GET /api/profile/[tag]/stats', () => {
  it('returns 404 when user does not exist', async () => {
    mockGetUserByTag.mockResolvedValue(null);
    const res = await GET(makeReq('Ghost#9'), { params: makeParams('Ghost#9') });
    expect(res.status).toBe(404);
  });

  it('returns stats for a known user', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    const res = await GET(makeReq('Darla#1'), { params: makeParams('Darla#1') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gamerTag).toBe('Darla#1');
    expect(body.totalReviews).toBe(12);
    expect(body.helpfulReviews).toBe(8);
    expect(body.avgRatingGiven).toBe(7.4);
    expect(body.mostReviewedPlatform).toBe('PC');
    expect(body.gamesReviewed).toBe(10);
  });

  it('calls getUserReviewStats with the correct gamerTag', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    await GET(makeReq('Darla#1'), { params: makeParams('Darla#1') });
    expect(mockGetStats).toHaveBeenCalledWith('Darla#1');
  });

  it('returns zero stats for a user with no reviews', async () => {
    mockGetUserByTag.mockResolvedValue(SAMPLE_USER);
    mockGetStats.mockResolvedValue({
      totalReviews: 0, helpfulReviews: 0,
      avgRatingGiven: 0, mostReviewedPlatform: null, gamesReviewed: 0,
    });
    const res = await GET(makeReq('Darla#1'), { params: makeParams('Darla#1') });
    const body = await res.json();
    expect(body.totalReviews).toBe(0);
    expect(body.mostReviewedPlatform).toBeNull();
  });
});
