jest.mock('@/lib/leaderboardStore', () => ({
  getTopReviewers: jest.fn(),
  getTopGames:     jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/route';
import { getTopReviewers, getTopGames } from '@/lib/leaderboardStore';

const mockGetTopReviewers = getTopReviewers as jest.Mock;
const mockGetTopGames     = getTopGames     as jest.Mock;

const TOP_REVIEWERS = [
  { reviewerTag: 'Alpha#1', reviewCount: 10, reputation: 25 },
  { reviewerTag: 'Beta#2',  reviewCount: 5,  reputation: 12 },
];
const TOP_GAMES = [
  { gameTitle: 'Elden Ring', avgRating: 9.2, reviewCount: 8 },
  { gameTitle: 'Hades',      avgRating: 8.7, reviewCount: 5 },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockGetTopReviewers.mockResolvedValue(TOP_REVIEWERS);
  mockGetTopGames.mockResolvedValue(TOP_GAMES);
});

describe('GET /api/leaderboard', () => {
  it('returns 200 with topReviewers and topGames', async () => {
    const res = await GET(new NextRequest('http://localhost/api/leaderboard'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.topReviewers).toHaveLength(2);
    expect(body.topGames).toHaveLength(2);
  });

  it('includes correct reviewer fields', async () => {
    const res = await GET(new NextRequest('http://localhost/api/leaderboard'));
    const body = await res.json();
    expect(body.topReviewers[0].reviewerTag).toBe('Alpha#1');
    expect(body.topReviewers[0].reputation).toBe(25);
    expect(body.topReviewers[0].reviewCount).toBe(10);
  });

  it('includes correct game fields', async () => {
    const res = await GET(new NextRequest('http://localhost/api/leaderboard'));
    const body = await res.json();
    expect(body.topGames[0].gameTitle).toBe('Elden Ring');
    expect(body.topGames[0].avgRating).toBeCloseTo(9.2);
    expect(body.topGames[0].reviewCount).toBe(8);
  });

  it('calls getTopReviewers and getTopGames with limit 10', async () => {
    await GET(new NextRequest('http://localhost/api/leaderboard'));
    expect(mockGetTopReviewers).toHaveBeenCalledWith(10);
    expect(mockGetTopGames).toHaveBeenCalledWith(10);
  });

  it('returns empty arrays when no data', async () => {
    mockGetTopReviewers.mockResolvedValue([]);
    mockGetTopGames.mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/leaderboard'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.topReviewers).toEqual([]);
    expect(body.topGames).toEqual([]);
  });
});
