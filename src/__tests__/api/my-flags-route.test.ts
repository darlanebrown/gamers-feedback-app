jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/flagStore', () => ({
  createFlag: jest.fn(),
  getFlagsByReporter: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/flags/mine/route';
import { getSession } from '@/lib/auth';
import { getFlagsByReporter } from '@/lib/flagStore';

const mockGetSession = getSession        as jest.Mock;
const mockGetFlags   = getFlagsByReporter as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

function makeFlag(overrides = {}) {
  return {
    id: 'f1', reviewId: 'r1', reporterTag: 'Darla#1',
    gameTitle: 'Hades', reviewerTag: 'Player#99',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/flags/mine${query}`);
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/flags/mine', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns the flags for the authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetFlags.mockResolvedValue([makeFlag()]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(mockGetFlags).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20 });
    const body = await res.json();
    expect(body.flags).toHaveLength(1);
    expect(body.flags[0].reviewId).toBe('r1');
  });

  it('supports pagination via ?page and ?limit', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetFlags.mockResolvedValue([]);
    await GET(makeReq('?page=2&limit=10'));
    expect(mockGetFlags).toHaveBeenCalledWith('Darla#1', { skip: 10, take: 10 });
  });

  it('returns an empty array when user has no flags', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetFlags.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.flags).toEqual([]);
  });
});
