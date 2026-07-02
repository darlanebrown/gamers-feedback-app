jest.mock('@/lib/gameComparisonService', () => ({
  compareGames: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/compare/route';
import { compareGames } from '@/lib/gameComparisonService';

const mockCompareGames = compareGames as jest.Mock;

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/games/compare${query}`);
}

const SAMPLE_RESULT = [
  {
    title: 'Elden Ring', avgRating: 9.2, reviewCount: 12,
    platforms: ['PC', 'PlayStation 5'], ratingDistribution: { 9: 7, 10: 5 },
  },
  {
    title: 'Hades', avgRating: 8.9, reviewCount: 8,
    platforms: ['PC', 'Nintendo Switch'], ratingDistribution: { 8: 4, 9: 3, 10: 1 },
  },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockCompareGames.mockResolvedValue(SAMPLE_RESULT);
});

describe('GET /api/games/compare', () => {
  it('returns 400 when ?a param is missing', async () => {
    const res = await GET(makeReq('?b=Hades'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when ?b param is missing', async () => {
    const res = await GET(makeReq('?a=Elden+Ring'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when both params are the same game', async () => {
    const res = await GET(makeReq('?a=Hades&b=Hades'));
    expect(res.status).toBe(400);
  });

  it('returns comparison data for two games', async () => {
    const res = await GET(makeReq('?a=Elden+Ring&b=Hades'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toHaveLength(2);
    expect(body.games[0].title).toBe('Elden Ring');
    expect(body.games[1].title).toBe('Hades');
  });

  it('calls compareGames with both titles', async () => {
    await GET(makeReq('?a=Elden+Ring&b=Hades'));
    expect(mockCompareGames).toHaveBeenCalledWith('Elden Ring', 'Hades');
  });

  it('includes avgRating, reviewCount, platforms and ratingDistribution', async () => {
    const res = await GET(makeReq('?a=Elden+Ring&b=Hades'));
    const body = await res.json();
    const first = body.games[0];
    expect(first.avgRating).toBe(9.2);
    expect(first.reviewCount).toBe(12);
    expect(first.platforms).toContain('PC');
    expect(first.ratingDistribution).toBeDefined();
  });
});
