jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/appealStore', () => ({
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
import { PATCH } from '@/app/api/admin/appeals/[id]/route';
import { getSession }                            from '@/lib/auth';
import { getAppealById, reviewAppeal }           from '@/lib/appealStore';
import { findUserByTag }                         from '@/lib/userStore';

const mockSession  = getSession    as jest.Mock;
const mockGetById  = getAppealById as jest.Mock;
const mockReview   = reviewAppeal  as jest.Mock;
const mockFindUser = findUserByTag as jest.Mock;

const ADMIN_SESSION  = { gamerTag: 'Admin#1', role: 'admin' };
const PENDING_APPEAL = { id: 'ap1', gamerTag: 'BannedUser#3', message: 'Please unban me', status: 'pending', reviewedAt: null, createdAt: new Date() };
const USER_WITH_EMAIL = { id: 'u1', gamerTag: 'BannedUser#3', email: 'banned@test.com', banned: true };

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
  mockGetById.mockResolvedValue(PENDING_APPEAL);
  mockReview.mockResolvedValue({ ...PENDING_APPEAL, status: 'approved', reviewedAt: new Date() });
  mockFindUser.mockResolvedValue(USER_WITH_EMAIL);
  (jest.requireMock('@/lib/userStore') as { unbanUserByTag: jest.Mock }).unbanUserByTag.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/auditLogStore') as { createAuditEntry: jest.Mock }).createAuditEntry.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendAppealApprovedEmail: jest.Mock }).sendAppealApprovedEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendAppealDeniedEmail: jest.Mock }).sendAppealDeniedEmail.mockResolvedValue(undefined);
});

describe('Appeal decision emails', () => {
  it('sends approval email when appeal is approved', async () => {
    await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    const { sendAppealApprovedEmail } = jest.requireMock('@/lib/emailService') as { sendAppealApprovedEmail: jest.Mock };
    expect(sendAppealApprovedEmail).toHaveBeenCalledWith(USER_WITH_EMAIL.email, 'BannedUser#3');
  });

  it('sends denial email when appeal is denied', async () => {
    mockReview.mockResolvedValue({ ...PENDING_APPEAL, status: 'denied', reviewedAt: new Date() });
    await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    const { sendAppealDeniedEmail } = jest.requireMock('@/lib/emailService') as { sendAppealDeniedEmail: jest.Mock };
    expect(sendAppealDeniedEmail).toHaveBeenCalledWith(USER_WITH_EMAIL.email, 'BannedUser#3');
  });

  it('still returns 200 if approval email throws', async () => {
    (jest.requireMock('@/lib/emailService') as { sendAppealApprovedEmail: jest.Mock })
      .sendAppealApprovedEmail.mockRejectedValue(new Error('smtp fail'));
    const res = await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    expect(res.status).toBe(200);
  });

  it('still returns 200 if denial email throws', async () => {
    mockReview.mockResolvedValue({ ...PENDING_APPEAL, status: 'denied', reviewedAt: new Date() });
    (jest.requireMock('@/lib/emailService') as { sendAppealDeniedEmail: jest.Mock })
      .sendAppealDeniedEmail.mockRejectedValue(new Error('smtp fail'));
    const res = await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    expect(res.status).toBe(200);
  });

  it('does not send approval email when appeal is denied', async () => {
    mockReview.mockResolvedValue({ ...PENDING_APPEAL, status: 'denied', reviewedAt: new Date() });
    await PATCH(makePatchReq('ap1', { status: 'denied' }), { params: makeParams('ap1') });
    const { sendAppealApprovedEmail } = jest.requireMock('@/lib/emailService') as { sendAppealApprovedEmail: jest.Mock };
    expect(sendAppealApprovedEmail).not.toHaveBeenCalled();
  });

  it('does not send denial email when appeal is approved', async () => {
    await PATCH(makePatchReq('ap1', { status: 'approved' }), { params: makeParams('ap1') });
    const { sendAppealDeniedEmail } = jest.requireMock('@/lib/emailService') as { sendAppealDeniedEmail: jest.Mock };
    expect(sendAppealDeniedEmail).not.toHaveBeenCalled();
  });
});
