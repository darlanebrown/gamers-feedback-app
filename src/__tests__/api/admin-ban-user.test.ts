jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));
jest.mock('@/lib/userStore', () => ({
  findUserByTag: jest.fn(),
  banUserByTag:  jest.fn(),
  unbanUserByTag: jest.fn(),
}));
jest.mock('@/lib/securityLogger', () => ({ logSecurityEvent: jest.fn() }));
jest.mock('@/lib/auditLogStore',  () => ({ createAuditEntry: jest.fn().mockResolvedValue(undefined) }));

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/admin/users/[tag]/ban/route';
import { getSession }    from '@/lib/auth';
import { findUserByTag, banUserByTag, unbanUserByTag } from '@/lib/userStore';

const mockSession   = getSession     as jest.Mock;
const mockFindUser  = findUserByTag  as jest.Mock;
const mockBan       = banUserByTag   as jest.Mock;
const mockUnban     = unbanUserByTag as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user'  };
const TARGET_USER   = { id: 'u2', gamerTag: 'BadActor#9', banned: false };
const BANNED_USER   = { ...TARGET_USER, banned: true, banReason: 'harassment', bannedUntil: null };

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/admin/users/BadActor%239/ban', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}
const makeParams = (tag: string) => Promise.resolve({ tag });

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(ADMIN_SESSION);
  mockFindUser.mockResolvedValue(TARGET_USER);
  mockBan.mockResolvedValue(BANNED_USER);
  mockUnban.mockResolvedValue({ ...TARGET_USER, banned: false, banReason: null, bannedUntil: null });
  (jest.requireMock('@/lib/auditLogStore') as { createAuditEntry: jest.Mock })
    .createAuditEntry.mockResolvedValue(undefined);
});

describe('POST /api/admin/users/[tag]/ban', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(403);
  });

  it('returns 404 when user does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await POST(makeReq('POST', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(404);
  });

  it('returns 409 when user is already banned', async () => {
    mockFindUser.mockResolvedValue(BANNED_USER);
    const res = await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already banned/i);
  });

  it('bans user and returns 200 with updated user', async () => {
    const res = await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.banned).toBe(true);
    expect(mockBan).toHaveBeenCalledWith('BadActor#9', expect.objectContaining({ banReason: 'harassment' }));
  });

  it('accepts optional bannedUntil date', async () => {
    const until = '2026-12-31T00:00:00.000Z';
    await POST(makeReq('POST', { reason: 'spam', bannedUntil: until }), { params: makeParams('BadActor#9') });
    expect(mockBan).toHaveBeenCalledWith('BadActor#9', expect.objectContaining({ bannedUntil: new Date(until) }));
  });

  it('logs security event on ban', async () => {
    await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    const { logSecurityEvent } = jest.requireMock('@/lib/securityLogger') as { logSecurityEvent: jest.Mock };
    expect(logSecurityEvent).toHaveBeenCalledWith('admin_ban', 'Admin#1', expect.any(String), expect.any(String));
  });
});

describe('DELETE /api/admin/users/[tag]/ban', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockSession.mockResolvedValue(USER_SESSION);
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(403);
  });

  it('returns 404 when user does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(404);
  });

  it('returns 409 when user is not banned', async () => {
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/not banned/i);
  });

  it('unbans user and returns 200', async () => {
    mockFindUser.mockResolvedValue(BANNED_USER);
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.banned).toBe(false);
    expect(mockUnban).toHaveBeenCalledWith('BadActor#9');
  });

  it('logs security event on unban', async () => {
    mockFindUser.mockResolvedValue(BANNED_USER);
    await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    const { logSecurityEvent } = jest.requireMock('@/lib/securityLogger') as { logSecurityEvent: jest.Mock };
    expect(logSecurityEvent).toHaveBeenCalledWith('admin_unban', 'Admin#1', expect.any(String), expect.any(String));
  });
});
