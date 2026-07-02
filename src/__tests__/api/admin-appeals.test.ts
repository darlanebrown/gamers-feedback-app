jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/appealStore', () => ({
  getAppeals:    jest.fn(),
  getAppealById: jest.fn(),
  reviewAppeal:  jest.fn(),
}));
jest.mock('@/lib/userStore', () => ({ unbanUserByTag: jest.fn(), findUserByTag: jest.fn() }));
jest.mock('@/lib/securityLogger', () => ({ logSecurityEvent: jest.fn() }));
jest.mock('@/lib/auditLogStore',  () => ({ createAuditEntry: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/emailService', () => ({
  sendAppealApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendAppealDeniedEmail:   jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { GET }   from '@/app/api/admin/appeals/route';
import { PATCH } from '@/app/api/admin/appeals/[id]/route';
import { getSession }                            from '@/lib/auth';
import { getAppeals, getAppealById, reviewAppeal } from '@/lib/appealStore';
import { unbanUserByTag }                        from '@/lib/userStore';

const mockSession    = getSession    as jest.Mock;
const mockGetAppeals = getAppeals    as jest.Mock;
const mockGetById    = getAppealById as jest.Mock;
const mockReview     = reviewAppeal  as jest.Mock;
const mockUnban      = unbanUserByTag as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user'  };

const PENDING_APPEAL  = { id: 'ap1', gamerTag: 'BannedUser#3', message: 'I was wrongly banned', status: 'pending',  reviewedAt: null,        createdAt: new Date('2026-07-01') };
const APPROVED_APPEAL = { ...PENDING_APPEAL, status: 'approved', reviewedAt: new Date('2026-07-02') };
const DENIED_APPEAL   = { ...PENDING_APPEAL, status: 'denied',   reviewedAt: new Date('2026-07-02') };

function makeListReq(qs = '') {
  return new NextRequest(`http://localhost/api/admin/appeals${qs}`);
}
function makePatchReq(id: string, body: object) {
  return new NextRequest(`http://localhost/api/admin/appeals/${id}`, {
    method: 'PATCH', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
const makeParams = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(ADMIN_SESSION);
  mockGetAppeals.mockResolvedValue([PENDING_APPEAL]);
  mockGetById.mockResolvedValue(PENDING_APPEAL);
  mockReview.mockResolvedValue(APPROVED_APPEAL);
  mockUnban.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/userStore') as { findUserByTag: jest.Mock })
    .findUserByTag.mockResolvedValue({ id: 'u1', gamerTag: 'BannedUser#3', email: 'banned@test.com' });
  (jest.requireMock('@/lib/auditLogStore') as { createAuditEntry: jest.Mock })
    .createAuditEntry.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendAppealApprovedEmail: jest.Mock })
    .sendAppealApprovedEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendAppealDeniedEmail: jest.Mock })
    .sendAppealDeniedEmail.mockResolvedValue(undefined);
});

describe('GET /api/admin/appeals', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeListReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await GET(makeListReq());
    expect(res.status).toBe(403);
  });

  it('returns all pending appeals by default', async () => {
    const res = await GET(makeListReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.appeals).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(mockGetAppeals).toHaveBeenCalledWith('pending');
  });

  it('supports ?status= filter', async () => {
    mockGetAppeals.mockResolvedValue([DENIED_APPEAL]);
    const res = await GET(makeListReq('?status=denied'));
    expect(mockGetAppeals).toHaveBeenCalledWith('denied');
    const body = await res.json();
    expect(body.appeals[0].status).toBe('denied');
  });

  it('returns empty list when no appeals exist', async () => {
    mockGetAppeals.mockResolvedValue([]);
    const res = await GET(makeListReq());
    const body = await res.json();
    expect(body.appeals).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe('PATCH /api/admin/appeals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    expect(res.status).toBe(403);
  });

  it('returns 404 when appeal not found', async () => {
    mockGetById.mockResolvedValue(null);
    const res = await PATCH(makePatchReq('ap99', { status: 'approved' }), { params: makeParams('ap99') });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await PATCH(makePatchReq('ap1', { status: 'maybe' }), { params: makeParams('ap1') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/approved.*denied/i);
  });

  it('returns 409 when appeal already reviewed', async () => {
    mockGetById.mockResolvedValue(APPROVED_APPEAL);
    const res = await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already reviewed/i);
  });

  it('approves appeal, unbans user, and returns 200', async () => {
    const res = await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    expect(res.status).toBe(200);
    expect(mockReview).toHaveBeenCalledWith('ap1', 'approved');
    expect(mockUnban).toHaveBeenCalledWith('BannedUser#3');
    const body = await res.json();
    expect(body.appeal.status).toBe('approved');
  });

  it('denies appeal without unbanning user', async () => {
    mockReview.mockResolvedValue(DENIED_APPEAL);
    const res = await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    expect(res.status).toBe(200);
    expect(mockReview).toHaveBeenCalledWith('ap1', 'denied');
    expect(mockUnban).not.toHaveBeenCalled();
  });

  it('logs security event on approval', async () => {
    await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    const { logSecurityEvent } = jest.requireMock('@/lib/securityLogger') as { logSecurityEvent: jest.Mock };
    expect(logSecurityEvent).toHaveBeenCalledWith('admin_appeal_approved', 'Admin#1', expect.any(String), expect.any(String));
  });

  it('logs security event on denial', async () => {
    mockReview.mockResolvedValue(DENIED_APPEAL);
    await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    const { logSecurityEvent } = jest.requireMock('@/lib/securityLogger') as { logSecurityEvent: jest.Mock };
    expect(logSecurityEvent).toHaveBeenCalledWith('admin_appeal_denied', 'Admin#1', expect.any(String), expect.any(String));
  });
});
