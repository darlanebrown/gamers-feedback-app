jest.mock('@/lib/reviewStore', () => ({
  searchReviews: jest.fn(),
  countReviews:  jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';
import { searchReviews, countReviews } from '@/lib/reviewStore';

const mockSearch = searchReviews as jest.Mock;
const mockCount  = countReviews  as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Elden Ring', platform: 'PC', rating: 9,
    headline: 'Masterpiece', body: 'Best game ever.',
    pros: 'Combat', cons: 'Difficult', playtime: '100h',
    reviewerTag: 'Darla#1', classification: 'helpful',
    classificationReason: null, createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function req(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  mockCount.mockResolvedValue(0);
});

describe('GET /api/search', () => {
  it('returns 200 with all reviews when no params given', async () => {
    mockSearch.mockResolvedValue([makeReview()]);
    mockCount.mockResolvedValue(1);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('passes keyword q to searchReviews', async () => {
    mockSearch.mockResolvedValue([makeReview()]);

    await GET(req({ q: 'masterpiece' }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'masterpiece' }),
    );
  });

  it('passes platform filter to searchReviews', async () => {
    mockSearch.mockResolvedValue([makeReview()]);

    await GET(req({ platform: 'PC' }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'PC' }),
    );
  });

  it('passes minRating and maxRating as numbers', async () => {
    mockSearch.mockResolvedValue([]);

    await GET(req({ minRating: '7', maxRating: '10' }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ minRating: 7, maxRating: 10 }),
    );
  });

  it('passes classification filter', async () => {
    mockSearch.mockResolvedValue([makeReview()]);

    await GET(req({ classification: 'helpful' }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ classification: 'helpful' }),
    );
  });

  it('passes sort param to searchReviews', async () => {
    mockSearch.mockResolvedValue([makeReview()]);

    await GET(req({ sort: 'highest' }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'highest' }),
    );
  });

  it('returns 400 for invalid sort value', async () => {
    const res = await GET(req({ sort: 'random' }));
    expect(res.status).toBe(400);
  });

  it('returns empty results when no reviews match', async () => {
    mockSearch.mockResolvedValue([]);

    const res = await GET(req({ q: 'xyznotfound' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('includes page and limit in response', async () => {
    mockSearch.mockResolvedValue([makeReview()]);

    const res = await GET(req({ page: '2', limit: '5' }));
    const body = await res.json();

    expect(body.page).toBe(2);
    expect(body.limit).toBe(5);
  });
});
