jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTag: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/mine/route';
import { getReviewsByTag } from '@/lib/reviewStore';
import { getSession } from '@/lib/auth';

const mockGetSession   = getSession      as jest.Mock;
const mockGetByTag     = getReviewsByTag as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1' };

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Great', body: 'Really good.', pros: 'Combat', cons: 'None',
    playtime: '80h', reviewerTag: 'Darla#1', classification: 'helpful',
    classificationReason: null, createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetByTag.mockResolvedValue([]);
});

function req() {
  return new NextRequest('http://localhost/api/reviews/mine');
}

describe('GET /api/reviews/mine', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('calls getReviewsByTag with the session gamerTag', async () => {
    await GET(req());
    expect(mockGetByTag).toHaveBeenCalledWith('Darla#1');
  });

  it('returns all reviews including non-helpful classifications', async () => {
    mockGetByTag.mockResolvedValue([
      makeReview({ classification: 'helpful' }),
      makeReview({ id: 'r2', classification: 'spam' }),
      makeReview({ id: 'r3', classification: 'pending' }),
    ]);
    const res = await GET(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(3);
  });

  it('response includes total count', async () => {
    mockGetByTag.mockResolvedValue([makeReview(), makeReview({ id: 'r2' })]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(2);
  });
});
