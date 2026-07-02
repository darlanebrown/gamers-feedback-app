jest.mock('@/lib/trendingReviewsService', () => ({
  getTrendingReviews: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/trending/route';
import { getTrendingReviews } from '@/lib/trendingReviewsService';

const mockGetTrending = getTrendingReviews as jest.Mock;

function makeReq(params = '') {
  return new NextRequest(`http://localhost/api/reviews/trending${params}`);
}

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Brilliant', body: 'Best game ever.',
    reviewerTag: 'Darla#1', classification: 'helpful',
    recentVotes: 42,
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/reviews/trending', () => {
  it('returns trending reviews with default limit of 10', async () => {
    mockGetTrending.mockResolvedValue([makeReview()]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(mockGetTrending).toHaveBeenCalledWith(10, 7);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].recentVotes).toBe(42);
  });

  it('respects a custom ?limit query param', async () => {
    mockGetTrending.mockResolvedValue([makeReview(), makeReview({ id: 'r2' })]);
    const res = await GET(makeReq('?limit=5'));
    expect(mockGetTrending).toHaveBeenCalledWith(5, 7);
    expect(res.status).toBe(200);
  });

  it('clamps limit to a maximum of 20', async () => {
    mockGetTrending.mockResolvedValue([]);
    await GET(makeReq('?limit=100'));
    expect(mockGetTrending).toHaveBeenCalledWith(20, 7);
  });

  it('returns an empty array when no trending reviews exist', async () => {
    mockGetTrending.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reviews).toEqual([]);
  });
});
