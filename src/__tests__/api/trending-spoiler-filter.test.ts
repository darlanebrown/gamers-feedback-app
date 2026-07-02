jest.mock('@/lib/trendingReviewsService', () => ({
  getTrendingReviews: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/trending/route';
import { getTrendingReviews } from '@/lib/trendingReviewsService';

const mockGetTrending = getTrendingReviews as jest.Mock;

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/reviews/trending${query}`);
}

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Great', body: 'Really fun.', reviewerTag: 'Darla#1',
    classification: 'helpful', recentVotes: 5, hasSpoilers: false,
    createdAt: new Date('2026-07-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/reviews/trending — spoiler filter', () => {
  it('returns all reviews including spoilers when hideSpoilers is not set', async () => {
    mockGetTrending.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
  });

  it('filters out spoiler reviews when ?hideSpoilers=true', async () => {
    mockGetTrending.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq('?hideSpoilers=true'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].hasSpoilers).toBe(false);
  });

  it('does not filter when ?hideSpoilers=false', async () => {
    mockGetTrending.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq('?hideSpoilers=false'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
  });

  it('still passes limit to the service', async () => {
    mockGetTrending.mockResolvedValue([]);
    await GET(makeReq('?limit=5&hideSpoilers=true'));
    expect(mockGetTrending).toHaveBeenCalledWith(5, 7);
  });
});
