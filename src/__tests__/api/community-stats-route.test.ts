jest.mock('@/lib/communityStatsService', () => ({
  getCommunityStats: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/stats/community/route';
import { getCommunityStats } from '@/lib/communityStatsService';

const mockStats = getCommunityStats as jest.Mock;

const SAMPLE = {
  users:       { total: 200, banned: 5 },
  reviews:     { total: 500, helpful: 420, avgRating: '8.2', uniqueGames: 87 },
  comments:    { total: 1200 },
  votes:       { total: 3400 },
  follows:     { total: 650 },
  gameFollows: { total: 890 },
  reactions:   { total: 2100 },
  wishlists:   { total: 730 },
  collections: { total: 310 },
  topGame:     'Hades',
  topReviewer: 'Darla#1',
};

function makeReq() {
  return new NextRequest('http://localhost/api/stats/community');
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/communityStatsService') as { getCommunityStats: jest.Mock })
    .getCommunityStats.mockResolvedValue(SAMPLE);
});

describe('GET /api/stats/community', () => {
  it('returns 200 with full community snapshot', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats).toEqual(SAMPLE);
  });

  it('includes all expected top-level keys', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    const keys = Object.keys(body.stats);
    expect(keys).toEqual(expect.arrayContaining([
      'users', 'reviews', 'comments', 'votes', 'follows',
      'gameFollows', 'reactions', 'wishlists', 'collections',
      'topGame', 'topReviewer',
    ]));
  });

  it('is publicly accessible — no auth required', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it('calls getCommunityStats exactly once', async () => {
    await GET(makeReq());
    expect(mockStats).toHaveBeenCalledTimes(1);
  });

  it('returns topGame and topReviewer', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.stats.topGame).toBe('Hades');
    expect(body.stats.topReviewer).toBe('Darla#1');
  });
});
