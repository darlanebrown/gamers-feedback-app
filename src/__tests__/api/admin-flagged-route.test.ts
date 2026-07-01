jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/flagStore', () => ({
  getFlaggedReviews: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/flagged/route';
import { getSession } from '@/lib/auth';
import { getFlaggedReviews } from '@/lib/flagStore';

const mockSession       = getSession       as jest.Mock;
const mockGetFlagged    = getFlaggedReviews as jest.Mock;

const ADMIN_SESSION  = { id: 'u1', email: 'admin@test.com', gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION   = { id: 'u2', email: 'user@test.com',  gamerTag: 'User#1',  role: 'user'  };

const FLAGGED = [
  { reviewId: 'r2', flagCount: 3, gameTitle: 'Elden Ring', reviewerTag: 'Player#2', classification: 'helpful' },
  { reviewId: 'r1', flagCount: 1, gameTitle: 'Hades',      reviewerTag: 'Player#1', classification: 'pending' },
];

function makeReq() {
  return new NextRequest('http://localhost/api/admin/flagged');
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/flagStore') as { getFlaggedReviews: jest.Mock })
    .getFlaggedReviews.mockResolvedValue(FLAGGED);
});

describe('GET /api/admin/flagged', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it('returns flagged reviews list for admin', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toHaveLength(2);
    expect(body.flagged[0].flagCount).toBe(3);
  });

  it('includes total count in response', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(typeof body.total).toBe('number');
    expect(body.total).toBe(2);
  });

  it('returns empty list when no reviews have been flagged', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetFlagged.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.flagged).toEqual([]);
    expect(body.total).toBe(0);
  });
});
