jest.mock('@/lib/emailService', () => ({
  sendBanEmail:   jest.fn().mockResolvedValue(undefined),
  sendUnbanEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));
jest.mock('@/lib/userStore', () => ({
  findUserByTag:  jest.fn(),
  banUserByTag:   jest.fn(),
  unbanUserByTag: jest.fn(),
}));
jest.mock('@/lib/securityLogger', () => ({ logSecurityEvent: jest.fn() }));
jest.mock('@/lib/auditLogStore',  () => ({ createAuditEntry: jest.fn().mockResolvedValue(undefined) }));

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/admin/users/[tag]/ban/route';
import { getSession }    from '@/lib/auth';
import { findUserByTag, banUserByTag, unbanUserByTag } from '@/lib/userStore';

const mockSession  = getSession    as jest.Mock;
const mockFind     = findUserByTag as jest.Mock;
const mockBan      = banUserByTag  as jest.Mock;
const mockUnban    = unbanUserByTag as jest.Mock;

const ADMIN   = { gamerTag: 'Admin#1', role: 'admin' };
const TARGET  = { id: 'u2', gamerTag: 'BadActor#9', email: 'bad@test.com', banned: false, bannedUntil: null };
const BANNED  = { ...TARGET, banned: true, banReason: 'harassment', bannedUntil: null };

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/admin/users/BadActor%239/ban', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}
const makeParams = (tag: string) => Promise.resolve({ tag });

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(ADMIN);
  mockFind.mockResolvedValue(TARGET);
  mockBan.mockResolvedValue(BANNED);
  mockUnban.mockResolvedValue({ ...TARGET, banned: false, banReason: null, bannedUntil: null });
  (jest.requireMock('@/lib/auditLogStore') as { createAuditEntry: jest.Mock })
    .createAuditEntry.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendBanEmail: jest.Mock; sendUnbanEmail: jest.Mock })
    .sendBanEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendBanEmail: jest.Mock; sendUnbanEmail: jest.Mock })
    .sendUnbanEmail.mockResolvedValue(undefined);
});

describe('ban email — POST /api/admin/users/[tag]/ban', () => {
  it('sends ban email fire-and-forget on successful ban', async () => {
    await POST(makeReq('POST', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    const { sendBanEmail } = jest.requireMock('@/lib/emailService') as { sendBanEmail: jest.Mock };
    expect(sendBanEmail).toHaveBeenCalledWith(
      TARGET.email,
      TARGET.gamerTag,
      expect.objectContaining({ reason: 'harassment' }),
    );
  });

  it('sends ban email with bannedUntil when temporary ban', async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    mockBan.mockResolvedValue({ ...BANNED, bannedUntil: new Date(until) });
    await POST(makeReq('POST', { reason: 'spam', bannedUntil: until }), { params: makeParams('BadActor#9') });
    const { sendBanEmail } = jest.requireMock('@/lib/emailService') as { sendBanEmail: jest.Mock };
    expect(sendBanEmail).toHaveBeenCalledWith(
      TARGET.email,
      TARGET.gamerTag,
      expect.objectContaining({ bannedUntil: expect.any(Date) }),
    );
  });

  it('still returns 200 if ban email throws', async () => {
    (jest.requireMock('@/lib/emailService') as { sendBanEmail: jest.Mock })
      .sendBanEmail.mockRejectedValue(new Error('smtp fail'));
    const res = await POST(makeReq('POST', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(200);
  });
});

describe('unban email — DELETE /api/admin/users/[tag]/ban', () => {
  it('sends unban email fire-and-forget on successful unban', async () => {
    mockFind.mockResolvedValue(BANNED);
    await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    const { sendUnbanEmail } = jest.requireMock('@/lib/emailService') as { sendUnbanEmail: jest.Mock };
    expect(sendUnbanEmail).toHaveBeenCalledWith(TARGET.email, TARGET.gamerTag);
  });

  it('still returns 200 if unban email throws', async () => {
    mockFind.mockResolvedValue(BANNED);
    (jest.requireMock('@/lib/emailService') as { sendUnbanEmail: jest.Mock })
      .sendUnbanEmail.mockRejectedValue(new Error('smtp fail'));
    const res = await DELETE(makeReq('DELETE'), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(200);
  });
});
