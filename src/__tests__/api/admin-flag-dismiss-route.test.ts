jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/flagStore', () => ({
  dismissFlags: jest.fn(),
  countFlags:   jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PATCH, GET } from '@/app/api/admin/flagged/[reviewId]/route';
import { getSession } from '@/lib/auth';
import { dismissFlags, countFlags } from '@/lib/flagStore';

const mockSession      = getSession   as jest.Mock;
const mockDismiss      = dismissFlags as jest.Mock;
const mockCountFlags   = countFlags   as jest.Mock;

const ADMIN = { id: 'u1', email: 'admin@test.com', gamerTag: 'Admin#1', role: 'admin' };
const USER  = { id: 'u2', email: 'user@test.com',  gamerTag: 'User#1',  role: 'user'  };

function makeReq(method = 'PATCH') {
  return new NextRequest('http://localhost/api/admin/flagged/r1', { method });
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/flagStore') as { dismissFlags: jest.Mock })
    .dismissFlags.mockResolvedValue(3);
  (jest.requireMock('@/lib/flagStore') as { countFlags: jest.Mock })
    .countFlags.mockResolvedValue(3);
});

describe('PATCH /api/admin/flagged/[reviewId]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makeReq(), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER);
    const res = await PATCH(makeReq(), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(403);
  });

  it('dismisses all flags for the review and returns count', async () => {
    mockSession.mockResolvedValue(ADMIN);
    const res = await PATCH(makeReq(), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dismissed).toBe(3);
    expect(mockDismiss).toHaveBeenCalledWith('r1');
  });

  it('returns dismissed:0 when review had no flags', async () => {
    mockSession.mockResolvedValue(ADMIN);
    mockDismiss.mockResolvedValue(0);
    const res = await PATCH(makeReq(), { params: { reviewId: 'r1' } });
    const body = await res.json();
    expect(body.dismissed).toBe(0);
  });
});

describe('GET /api/admin/flagged/[reviewId]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq('GET'), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER);
    const res = await GET(makeReq('GET'), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(403);
  });

  it('returns flag count for a review', async () => {
    mockSession.mockResolvedValue(ADMIN);
    const res = await GET(makeReq('GET'), { params: { reviewId: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3);
    expect(mockCountFlags).toHaveBeenCalledWith('r1');
  });
});
