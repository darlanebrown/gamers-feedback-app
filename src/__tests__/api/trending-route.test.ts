import { GET } from '@/app/api/trending/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/trendingService', () => ({
  getTrendingGames: jest.fn(),
}));

import { getTrendingGames } from '@/lib/trendingService';

const mockGetTrending = getTrendingGames as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetTrending.mockResolvedValue([]);
});

const req = new NextRequest('http://localhost/api/trending');

describe('GET /api/trending', () => {
  it('returns 200 with trending array', async () => {
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.trending)).toBe(true);
  });

  it('calls getTrendingGames with limit 6 and 7 days', async () => {
    await GET(req);
    expect(mockGetTrending).toHaveBeenCalledWith(6, 7);
  });

  it('returns game fields in each trending item', async () => {
    mockGetTrending.mockResolvedValue([
      { gameTitle: 'Elden Ring', reviewCount: 12, avgRating: 8.5 },
    ]);
    const res = await GET(req);
    const data = await res.json();
    expect(data.trending[0]).toMatchObject({
      gameTitle: 'Elden Ring',
      reviewCount: 12,
      avgRating: 8.5,
    });
  });

  it('returns 500 when getTrendingGames throws', async () => {
    mockGetTrending.mockRejectedValue(new Error('DB error'));
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
