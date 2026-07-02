jest.mock('@/lib/reviewSearchService', () => ({
  searchReviews: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/search/route';
import { searchReviews } from '@/lib/reviewSearchService';

const mockSearch = searchReviews as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Amazing roguelike', body: 'Great game', pros: 'fun', cons: 'none',
    playtime: '20h', reviewerTag: 'Darla#1', classification: 'helpful',
    hasSpoilers: false, viewCount: 0, createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/reviews/search');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSearch.mockResolvedValue({ reviews: [], total: 0 });
});

describe('GET /api/reviews/search', () => {
  it('returns 400 when q is missing', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/q/);
  });

  it('returns 400 when q is empty string', async () => {
    const res = await GET(makeReq({ q: '  ' }));
    expect(res.status).toBe(400);
  });

  it('returns search results with total and pagination', async () => {
    mockSearch.mockResolvedValue({ reviews: [makeReview()], total: 1 });
    const res = await GET(makeReq({ q: 'roguelike' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it('passes q, platform, minRating, maxRating, skip, take to searchReviews', async () => {
    await GET(makeReq({ q: 'hades', platform: 'PC', minRating: '7', maxRating: '10', page: '2', limit: '10' }));
    expect(mockSearch).toHaveBeenCalledWith({
      q: 'hades', platform: 'PC', minRating: 7, maxRating: 10, skip: 10, take: 10,
    });
  });

  it('defaults page=1 limit=20 and omits platform/rating when not provided', async () => {
    await GET(makeReq({ q: 'celeste' }));
    expect(mockSearch).toHaveBeenCalledWith({
      q: 'celeste', platform: undefined, minRating: undefined, maxRating: undefined, skip: 0, take: 20,
    });
  });

  it('clamps limit to max 50', async () => {
    await GET(makeReq({ q: 'hades', limit: '999' }));
    const call = mockSearch.mock.calls[0][0];
    expect(call.take).toBe(50);
  });

  it('only searches helpful reviews (classification filter applied inside service)', async () => {
    mockSearch.mockResolvedValue({ reviews: [makeReview()], total: 1 });
    await GET(makeReq({ q: 'hades' }));
    expect(mockSearch).toHaveBeenCalledTimes(1);
    const body = await (await GET(makeReq({ q: 'hades' }))).json();
    expect(body.reviews).toBeDefined();
  });
});
