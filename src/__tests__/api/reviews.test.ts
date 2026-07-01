jest.mock('@/lib/reviewStore', () => ({
  getAllReviews:             jest.fn(),
  getHelpfulReviews:        jest.fn(),
  getReviewsByGame:         jest.fn(),
  addReview:                jest.fn(),
  getRecentReviewCountByTag: jest.fn(),
  countAllReviews:          jest.fn(),
  countHelpfulReviews:      jest.fn(),
}));

jest.mock('@/lib/alertService', () => ({
  checkForBombing: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/reviews/route';
import { getAllReviews, getHelpfulReviews, getReviewsByGame, addReview, getRecentReviewCountByTag, countAllReviews, countHelpfulReviews } from '@/lib/reviewStore';
import { checkForBombing } from '@/lib/alertService';

const mockGetAll          = getAllReviews              as jest.Mock;
const mockGetHelp         = getHelpfulReviews          as jest.Mock;
const mockGetByGame       = getReviewsByGame           as jest.Mock;
const mockAdd             = addReview                  as jest.Mock;
const mockCheckBombing    = checkForBombing            as jest.Mock;
const mockRecentCount     = getRecentReviewCountByTag  as jest.Mock;
const mockCountAll        = countAllReviews            as jest.Mock;
const mockCountHelp       = countHelpfulReviews        as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1',
    gameTitle: 'Hades',
    platform: 'PC',
    rating: 9,
    headline: 'Roguelike perfection',
    body: 'Every run feels fresh.',
    pros: 'Tight gameplay',
    cons: 'Repetitive music',
    playtime: '80 hours',
    reviewerTag: 'Player#99',
    classification: 'helpful',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockCheckBombing.mockResolvedValue(undefined);
  mockRecentCount.mockResolvedValue(0);
  mockCountAll.mockResolvedValue(0);
  mockCountHelp.mockResolvedValue(0);
});

describe('GET /api/reviews', () => {
  it('returns all reviews with default pagination', async () => {
    mockGetAll.mockResolvedValue([makeReview()]);
    mockCountAll.mockResolvedValue(1);
    const req = new NextRequest('http://localhost/api/reviews');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGetAll).toHaveBeenCalledWith({ skip: 0, take: 20 });
    expect(body.reviews).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it('passes correct skip for page 2', async () => {
    mockGetAll.mockResolvedValue([]);
    mockCountAll.mockResolvedValue(25);
    const req = new NextRequest('http://localhost/api/reviews?page=2&limit=10');
    await GET(req);

    expect(mockGetAll).toHaveBeenCalledWith({ skip: 10, take: 10 });
  });

  it('calls getHelpfulReviews and countHelpfulReviews when filter=helpful', async () => {
    mockGetHelp.mockResolvedValue([makeReview()]);
    mockCountHelp.mockResolvedValue(5);
    const req = new NextRequest('http://localhost/api/reviews?filter=helpful');
    const res = await GET(req);
    const body = await res.json();

    expect(mockGetHelp).toHaveBeenCalledWith({ skip: 0, take: 20 });
    expect(mockCountHelp).toHaveBeenCalledTimes(1);
    expect(body.total).toBe(5);
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('calls getReviewsByGame when game param provided (no pagination)', async () => {
    mockGetByGame.mockResolvedValue([makeReview()]);
    const req = new NextRequest('http://localhost/api/reviews?game=Hades');
    await GET(req);

    expect(mockGetByGame).toHaveBeenCalledWith('Hades');
    expect(mockGetAll).not.toHaveBeenCalled();
  });

  it('game param takes priority over filter param', async () => {
    mockGetByGame.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/reviews?game=Hades&filter=helpful');
    await GET(req);

    expect(mockGetByGame).toHaveBeenCalledWith('Hades');
    expect(mockGetHelp).not.toHaveBeenCalled();
  });
});

const VALID_BODY = {
  gameTitle: 'Hades', platform: 'PC', rating: 9,
  headline: 'Roguelike perfection',
  body: 'Every run feels completely fresh thanks to procedural generation and tight combat.',
  pros: 'Tight gameplay', cons: 'Repetitive music',
  playtime: '80 hours', reviewerTag: 'Player#99',
};

describe('POST /api/reviews — validation', () => {
  it('rejects rating below 1', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, rating: 0 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects rating above 10', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, rating: 11 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects headline shorter than 5 characters', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, headline: 'Ok' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects headline longer than 120 characters', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, headline: 'x'.repeat(121) }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects body shorter than 20 characters', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, body: 'Too short.' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid platform', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, platform: 'Atari 2600' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects gameTitle shorter than 2 characters', async () => {
    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...VALID_BODY, gameTitle: 'X' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/reviews', () => {
  it('creates a review and returns 201', async () => {
    const created = makeReview({ classification: 'pending' });
    mockAdd.mockResolvedValue(created);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        gameTitle: 'Hades', platform: 'PC', rating: 9,
        headline: 'Roguelike perfection', body: 'Every run feels fresh.',
        pros: 'Tight gameplay', cons: 'Repetitive music',
        playtime: '80 hours', reviewerTag: 'Player#99',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.review.gameTitle).toBe('Hades');
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when addReview throws', async () => {
    mockAdd.mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to create review');
  });
});

describe('POST /api/reviews — rate limiting', () => {
  it('returns 429 when reviewer has hit the hourly limit', async () => {
    mockRecentCount.mockResolvedValue(3);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/rate limit/i);
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('includes retryAfter in seconds in the 429 response', async () => {
    mockRecentCount.mockResolvedValue(5);

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(typeof body.retryAfter).toBe('number');
    expect(body.retryAfter).toBeLessThanOrEqual(3600);
  });

  it('proceeds normally when reviewer is under the limit', async () => {
    mockRecentCount.mockResolvedValue(2);
    mockAdd.mockResolvedValue(makeReview());

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });
});
