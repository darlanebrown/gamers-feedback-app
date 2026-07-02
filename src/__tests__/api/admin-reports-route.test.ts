jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/userReportStore', () => ({
  createUserReport: jest.fn(),
  hasReported:      jest.fn(),
  getUserReports:   jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/reports/route';
import { getSession }    from '@/lib/auth';
import { getUserReports } from '@/lib/userReportStore';

const mockSession    = getSession     as jest.Mock;
const mockGetReports = getUserReports as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user'  };

const REPORTS = [
  { id: 'rp1', reporterTag: 'Darla#1',  reportedTag: 'BadActor#9', reason: 'spam',        createdAt: '2026-06-01T00:00:00.000Z' },
  { id: 'rp2', reporterTag: 'Gamer#2',  reportedTag: 'ToxicUser#3',reason: 'harassment',   createdAt: '2026-06-02T00:00:00.000Z' },
  { id: 'rp3', reporterTag: 'Player#5', reportedTag: 'BadActor#9', reason: 'impersonation',createdAt: '2026-06-03T00:00:00.000Z' },
];

function makeReq(qs = '') {
  return new NextRequest(`http://localhost/api/admin/reports${qs}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetReports.mockResolvedValue(REPORTS);
});

describe('GET /api/admin/reports', () => {
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

  it('returns all reports with total for admin', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toHaveLength(3);
    expect(body.total).toBe(3);
  });

  it('returns reports with correct shape', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reports[0]).toMatchObject({
      id:          'rp1',
      reporterTag: 'Darla#1',
      reportedTag: 'BadActor#9',
      reason:      'spam',
    });
  });

  it('supports ?reportedTag= filter', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReports.mockResolvedValue([REPORTS[0], REPORTS[2]]);
    const res = await GET(makeReq('?reportedTag=BadActor%239'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mockGetReports).toHaveBeenCalledWith(expect.objectContaining({ reportedTag: 'BadActor#9' }));
    expect(body.total).toBe(2);
  });

  it('supports pagination via ?skip= and ?take=', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReports.mockResolvedValue([REPORTS[1]]);
    const res = await GET(makeReq('?skip=1&take=1'));
    const body = await res.json();
    expect(mockGetReports).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 1 }));
    expect(body.reports).toHaveLength(1);
  });

  it('returns empty list when no reports exist', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReports.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reports).toEqual([]);
    expect(body.total).toBe(0);
  });
});
