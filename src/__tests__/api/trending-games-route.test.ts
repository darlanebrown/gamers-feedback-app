jest.mock('@/lib/trendingGamesService', () => ({
  getTrendingGames: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/trending/route';
import { getTrendingGames } from '@/lib/trendingGamesService';

const mockTrending = getTrendingGames as jest.Mock;

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/games/trending');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const SAMPLE = [
  { gameTitle: 'Hades',   reviewCount: 12, avgRating: '9.1' },
  { gameTitle: 'Celeste', reviewCount:  7, avgRating: '8.4' },
];

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/trendingGamesService') as { getTrendingGames: jest.Mock })
    .getTrendingGames.mockResolvedValue(SAMPLE);
});

describe('GET /api/games/trending', () => {
  it('returns trending games with reviewCount and avgRating', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toHaveLength(2);
    expect(body.games[0].gameTitle).toBe('Hades');
    expect(body.games[0].reviewCount).toBe(12);
    expect(body.games[0].avgRating).toBe('9.1');
  });

  it('is publicly accessible — no auth required', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it('defaults to days=7 and limit=10', async () => {
    await GET(makeReq());
    expect(mockTrending).toHaveBeenCalledWith({ days: 7, limit: 10 });
  });

  it('passes custom days and limit params', async () => {
    await GET(makeReq({ days: '14', limit: '5' }));
    expect(mockTrending).toHaveBeenCalledWith({ days: 14, limit: 5 });
  });

  it('clamps limit to max 25', async () => {
    await GET(makeReq({ limit: '999' }));
    const call = mockTrending.mock.calls[0][0];
    expect(call.limit).toBe(25);
  });

  it('clamps days to max 30', async () => {
    await GET(makeReq({ days: '999' }));
    const call = mockTrending.mock.calls[0][0];
    expect(call.days).toBe(30);
  });

  it('returns empty array when no recent reviews', async () => {
    mockTrending.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.games).toEqual([]);
  });
});
