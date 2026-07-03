jest.mock('@/lib/gameStatsService', () => ({
  getGameStats: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/[title]/stats/route';
import { getGameStats } from '@/lib/gameStatsService';

const mockGetStats = getGameStats as jest.Mock;

const SAMPLE_STATS = {
  gameTitle:           'Elden Ring',
  reviewCount:         42,
  helpfulReviewCount:  30,
  avgRating:           9.2,
  followerCount:       135,
  helpfulVotes:        88,
  bookmarkCount:       55,
  ratingDistribution:  { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2, 6: 3, 7: 5, 8: 8, 9: 12, 10: 11 },
};

function makeReq(title: string) {
  return new NextRequest(`http://localhost/api/games/${encodeURIComponent(title)}/stats`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetStats.mockResolvedValue(SAMPLE_STATS);
});

describe('GET /api/games/[title]/stats', () => {
  it('returns 200 with game stats', async () => {
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.gameTitle).toBe('Elden Ring');
  });

  it('calls getGameStats with the title param', async () => {
    await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    expect(mockGetStats).toHaveBeenCalledWith('Elden Ring');
  });

  it('returns reviewCount and helpfulReviewCount', async () => {
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    const body = await res.json();
    expect(body.stats.reviewCount).toBe(42);
    expect(body.stats.helpfulReviewCount).toBe(30);
  });

  it('returns avgRating and followerCount', async () => {
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    const body = await res.json();
    expect(body.stats.avgRating).toBe(9.2);
    expect(body.stats.followerCount).toBe(135);
  });

  it('returns helpfulVotes and bookmarkCount', async () => {
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    const body = await res.json();
    expect(body.stats.helpfulVotes).toBe(88);
    expect(body.stats.bookmarkCount).toBe(55);
  });

  it('returns ratingDistribution with keys 1-10', async () => {
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    const body = await res.json();
    const dist = body.stats.ratingDistribution;
    expect(Object.keys(dist).map(Number).sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });

  it('is public — no auth required', async () => {
    const res = await GET(makeReq('Hollow Knight'), { params: { title: 'Hollow Knight' } });
    expect(res.status).toBe(200);
  });

  it('returns 500 when service throws', async () => {
    mockGetStats.mockRejectedValue(new Error('DB error'));
    const res = await GET(makeReq('Elden Ring'), { params: { title: 'Elden Ring' } });
    expect(res.status).toBe(500);
  });
});
