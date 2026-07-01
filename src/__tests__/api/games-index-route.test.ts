import { GET } from '@/app/api/games/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/gameAnalytics', () => ({
  getReviewedGames: jest.fn(),
}));

import { getReviewedGames } from '@/lib/gameAnalytics';

const mockGetGames = getReviewedGames as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetGames.mockResolvedValue([]);
});

describe('GET /api/games', () => {
  it('returns 200 with games array', async () => {
    const req = new NextRequest('http://localhost/api/games');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.games)).toBe(true);
  });

  it('passes sort, limit, and offset from query params', async () => {
    const req = new NextRequest('http://localhost/api/games?sort=rating&limit=12&offset=24');
    await GET(req);
    expect(mockGetGames).toHaveBeenCalledWith({ sort: 'rating', limit: 12, offset: 24 });
  });

  it('defaults to sort=reviews, limit=24, offset=0', async () => {
    const req = new NextRequest('http://localhost/api/games');
    await GET(req);
    expect(mockGetGames).toHaveBeenCalledWith({ sort: 'reviews', limit: 24, offset: 0 });
  });

  it('returns 500 when getReviewedGames throws', async () => {
    mockGetGames.mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/games');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
