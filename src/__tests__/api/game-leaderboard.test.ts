jest.mock('@/lib/leaderboardService', () => ({
  getGameLeaderboard: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/leaderboard/route';
import { getGameLeaderboard } from '@/lib/leaderboardService';

const mockGetLeaderboard = getGameLeaderboard as jest.Mock;

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/games/leaderboard${query}`);
}

const SAMPLE_ENTRIES = [
  { rank: 1, gameTitle: 'Elden Ring',   avgRating: 9.5, reviewCount: 12 },
  { rank: 2, gameTitle: 'Hades',        avgRating: 9.1, reviewCount: 8  },
  { rank: 3, gameTitle: 'Celeste',      avgRating: 8.8, reviewCount: 5  },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockGetLeaderboard.mockResolvedValue(SAMPLE_ENTRIES);
});

describe('GET /api/games/leaderboard', () => {
  it('returns ranked games with avgRating and reviewCount', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaderboard).toHaveLength(3);
    expect(body.leaderboard[0]).toMatchObject({
      rank: 1,
      gameTitle: 'Elden Ring',
      avgRating: 9.5,
      reviewCount: 12,
    });
  });

  it('passes default limit=10 and minReviews=3 to the service', async () => {
    await GET(makeReq());
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 10, minReviews: 3 });
  });

  it('respects ?limit query param', async () => {
    mockGetLeaderboard.mockResolvedValue(SAMPLE_ENTRIES.slice(0, 2));
    const res = await GET(makeReq('?limit=2'));
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 2, minReviews: 3 });
    const body = await res.json();
    expect(body.leaderboard).toHaveLength(2);
  });

  it('clamps limit to max 25', async () => {
    await GET(makeReq('?limit=999'));
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 25, minReviews: 3 });
  });

  it('respects ?minReviews query param', async () => {
    await GET(makeReq('?minReviews=5'));
    expect(mockGetLeaderboard).toHaveBeenCalledWith({ limit: 10, minReviews: 5 });
  });

  it('returns empty leaderboard when no games qualify', async () => {
    mockGetLeaderboard.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaderboard).toEqual([]);
  });
});
