jest.mock('@/lib/auditLogStore', () => ({
  getAuditLog:     jest.fn(),
  createAuditEntry: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/audit/route';
import { getAuditLog } from '@/lib/auditLogStore';
import { getSession } from '@/lib/auth';

const mockGetAuditLog = getAuditLog as jest.Mock;
const mockGetSession  = getSession  as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user' };

const SAMPLE_ENTRIES = [
  { id: 'a1', action: 'admin_ban',    actorTag: 'Admin#1', targetId: 'u2', detail: null, createdAt: '2026-07-01T10:00:00.000Z' },
  { id: 'a2', action: 'admin_promote', actorTag: 'Admin#1', targetId: 'u3', detail: null, createdAt: '2026-07-01T09:00:00.000Z' },
];

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/admin/audit${query}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetAuditLog.mockResolvedValue(SAMPLE_ENTRIES);
});

describe('GET /api/admin/audit', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it('returns paginated audit entries for admin', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].action).toBe('admin_ban');
  });

  it('passes default limit=50 and skip=0 to store', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    await GET(makeReq());
    expect(mockGetAuditLog).toHaveBeenCalledWith({ action: undefined, limit: 50, skip: 0 });
  });

  it('passes ?action filter to store', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    await GET(makeReq('?action=admin_ban'));
    expect(mockGetAuditLog).toHaveBeenCalledWith({ action: 'admin_ban', limit: 50, skip: 0 });
  });

  it('respects ?page param', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    await GET(makeReq('?page=2'));
    expect(mockGetAuditLog).toHaveBeenCalledWith({ action: undefined, limit: 50, skip: 50 });
  });

  it('returns empty entries array when log is empty', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetAuditLog.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.entries).toEqual([]);
  });
});
