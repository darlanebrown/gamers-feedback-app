jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTag: jest.fn(),
}));

jest.mock('@/lib/followStore', () => ({
  getFollowerCount:  jest.fn().mockResolvedValue(0),
  getFollowingCount: jest.fn().mockResolvedValue(0),
  isFollowing:       jest.fn().mockResolvedValue(false),
}));

jest.mock('@/lib/auth', () => ({
  getSession:    jest.fn().mockResolvedValue(null),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/route';
import { getReviewsByTag } from '@/lib/reviewStore';

const mockGetByTag = getReviewsByTag as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Great', body: 'Really good game with lots of depth.',
    pros: 'Combat', cons: 'Repetitive', playtime: '80h',
    reviewerTag: 'Darla#1', classification: 'helpful',
    classificationReason: null, createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/profile/[tag]', () => {
  it('returns 200 with reviews and reputation', async () => {
    mockGetByTag.mockResolvedValue([makeReview(), makeReview({ id: 'r2', rating: 7 })]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.gamerTag).toBe('Darla#1');
    expect(body.reviews).toHaveLength(2);
    expect(body.reputation).toBeDefined();
  });

  it('computes reputation score from helpful percentage', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview({ classification: 'helpful' }),
      makeReview({ id: 'r2', classification: 'helpful' }),
      makeReview({ id: 'r3', classification: 'spam' }),
      makeReview({ id: 'r4', classification: 'spam' }),
    ]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(body.reputation.score).toBe(50);
  });

  it('awards Gold badge for >= 80% helpful', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview(), makeReview({ id: 'r2' }), makeReview({ id: 'r3' }),
      makeReview({ id: 'r4' }), makeReview({ id: 'r5' }),
    ]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(body.reputation.badge).toBe('Gold');
  });

  it('awards Silver badge for 50-79% helpful', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview({ classification: 'helpful' }),
      makeReview({ id: 'r2', classification: 'helpful' }),
      makeReview({ id: 'r3', classification: 'spam' }),
    ]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(body.reputation.badge).toBe('Silver');
  });

  it('awards Bronze badge for < 50% helpful', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview({ classification: 'helpful' }),
      makeReview({ id: 'r2', classification: 'spam' }),
      makeReview({ id: 'r3', classification: 'toxic' }),
      makeReview({ id: 'r4', classification: 'spam' }),
    ]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(body.reputation.badge).toBe('Bronze');
  });

  it('returns score 0 and no badge for reviewer with no reviews', async () => {
    mockGetByTag.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/profile/Ghost%231');
    const res = await GET(req, { params: { tag: 'Ghost#1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reputation.score).toBe(0);
    expect(body.reputation.badge).toBeNull();
  });

  it('includes stats summary in response', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview({ classification: 'helpful', rating: 9 }),
      makeReview({ id: 'r2', classification: 'spam', rating: 1 }),
    ]);

    const req = new NextRequest('http://localhost/api/profile/Darla%231');
    const res = await GET(req, { params: { tag: 'Darla#1' } });
    const body = await res.json();

    expect(body.stats.total).toBe(2);
    expect(body.stats.helpful).toBe(1);
    expect(body.stats.spam).toBe(1);
    expect(body.stats.avgRating).toBe(9);
  });
});
