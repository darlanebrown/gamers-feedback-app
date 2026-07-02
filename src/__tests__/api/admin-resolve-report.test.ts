jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/userReportStore', () => ({
  createUserReport:  jest.fn(),
  hasReported:       jest.fn(),
  getUserReports:    jest.fn(),
  resolveUserReport: jest.fn(),
  getReportById:     jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/admin/reports/[id]/route';
import { getSession }                       from '@/lib/auth';
import { resolveUserReport, getReportById } from '@/lib/userReportStore';

const mockSession  = getSession        as jest.Mock;
const mockResolve  = resolveUserReport as jest.Mock;
const mockGetById  = getReportById     as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user'  };

const REPORT = {
  id: 'rp1', reporterTag: 'Darla#1', reportedTag: 'BadActor#9',
  reason: 'spam', createdAt: new Date('2026-06-01'), resolvedAt: null, resolution: null,
};

const RESOLVED = { ...REPORT, resolvedAt: new Date('2026-07-02'), resolution: 'warned' };

function makeReq(id: string, body: object) {
  return new NextRequest(`http://localhost/api/admin/reports/${id}`, {
    method: 'PATCH', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
const makeParams = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  jest.resetAllMocks();
  mockGetById.mockResolvedValue(REPORT);
  mockResolve.mockResolvedValue(RESOLVED);
});

describe('PATCH /api/admin/reports/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makeReq('rp1', { resolution: 'warned' }), { params: makeParams('rp1') });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await PATCH(makeReq('rp1', { resolution: 'warned' }), { params: makeParams('rp1') });
    expect(res.status).toBe(403);
  });

  it('returns 404 when report does not exist', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetById.mockResolvedValue(null);
    const res = await PATCH(makeReq('rp99', { resolution: 'warned' }), { params: makeParams('rp99') });
    expect(res.status).toBe(404);
  });

  it('returns 400 when resolution is missing', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await PATCH(makeReq('rp1', {}), { params: makeParams('rp1') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/resolution/i);
  });

  it('resolves report and returns 200 with updated report', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    const res = await PATCH(makeReq('rp1', { resolution: 'warned' }), { params: makeParams('rp1') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.report.resolution).toBe('warned');
    expect(body.report.resolvedAt).toBeTruthy();
  });

  it('calls resolveUserReport with correct args', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    await PATCH(makeReq('rp1', { resolution: 'banned' }), { params: makeParams('rp1') });
    expect(mockResolve).toHaveBeenCalledWith('rp1', 'banned');
  });

  it('returns 409 when report is already resolved', async () => {
    mockSession.mockResolvedValue(ADMIN_SESSION);
    mockGetById.mockResolvedValue(RESOLVED);
    const res = await PATCH(makeReq('rp1', { resolution: 'warned' }), { params: makeParams('rp1') });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already resolved/i);
  });
});
