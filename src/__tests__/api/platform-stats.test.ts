jest.mock('@/lib/platformStatsService', () => ({
  getPlatformStats: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/stats/platforms/route';
import { getPlatformStats } from '@/lib/platformStatsService';

const mockGetPlatformStats = getPlatformStats as jest.Mock;

function makeReq() {
  return new NextRequest('http://localhost/api/stats/platforms');
}

const SAMPLE_STATS = [
  { platform: 'PC',            reviewCount: 45, avgRating: 8.2, topGame: 'Elden Ring'   },
  { platform: 'PlayStation 5', reviewCount: 32, avgRating: 7.9, topGame: 'God of War'   },
  { platform: 'Nintendo Switch', reviewCount: 18, avgRating: 8.5, topGame: 'Hollow Knight' },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockGetPlatformStats.mockResolvedValue(SAMPLE_STATS);
});

describe('GET /api/stats/platforms', () => {
  it('returns 200 with platform stats array', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.platforms).toHaveLength(3);
  });

  it('each entry has platform, reviewCount, avgRating, topGame', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.platforms[0]).toMatchObject({
      platform:    'PC',
      reviewCount: 45,
      avgRating:   8.2,
      topGame:     'Elden Ring',
    });
  });

  it('entries are sorted by reviewCount descending', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    const counts = body.platforms.map((p: { reviewCount: number }) => p.reviewCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('returns empty array when no helpful reviews exist', async () => {
    mockGetPlatformStats.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.platforms).toEqual([]);
  });

  it('topGame is null when a platform has no game with multiple reviews', async () => {
    mockGetPlatformStats.mockResolvedValue([
      { platform: 'Steam Deck', reviewCount: 1, avgRating: 9.0, topGame: null },
    ]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.platforms[0].topGame).toBeNull();
  });
});
