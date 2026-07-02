jest.mock('@/lib/userReportStore', () => ({
  createUserReport: jest.fn(),
  hasReported:      jest.fn(),
}));
jest.mock('@/lib/auth',      () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/emailService', () => ({
  sendModerationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/users/[tag]/report/route';
import { createUserReport, hasReported } from '@/lib/userReportStore';
import { getSession }    from '@/lib/auth';
import { findUserByTag } from '@/lib/userStore';

const mockCreate     = createUserReport as jest.Mock;
const mockHasReport  = hasReported      as jest.Mock;
const mockSession    = getSession        as jest.Mock;
const mockFindUser   = findUserByTag     as jest.Mock;

const SESSION  = { gamerTag: 'Darla#1', role: 'user' };
const TARGET   = { id: 'u2', gamerTag: 'BadActor#9' };

function makeReq(tag: string, body: object) {
  return new NextRequest(`http://localhost/api/users/${tag}/report`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
const makeParams = (tag: string) => Promise.resolve({ tag });

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockFindUser.mockResolvedValue(TARGET);
  mockHasReport.mockResolvedValue(false);
  mockCreate.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendModerationEmail: jest.Mock })
    .sendModerationEmail.mockResolvedValue(undefined);
});

describe('POST /api/users/[tag]/report', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq('BadActor#9', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(401);
  });

  it('returns 400 when trying to report yourself', async () => {
    const res = await POST(makeReq('Darla#1', { reason: 'spam' }), { params: makeParams('Darla#1') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  it('returns 404 when reported user does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await POST(makeReq('Ghost#9', { reason: 'spam' }), { params: makeParams('Ghost#9') });
    expect(res.status).toBe(404);
  });

  it('returns 400 when reason is missing', async () => {
    const res = await POST(makeReq('BadActor#9', {}), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/reason/i);
  });

  it('returns 409 when already reported this user', async () => {
    mockHasReport.mockResolvedValue(true);
    const res = await POST(makeReq('BadActor#9', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(409);
  });

  it('creates report and returns 201 on success', async () => {
    const res = await POST(makeReq('BadActor#9', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith('Darla#1', 'BadActor#9', 'spam');
  });

  it('sends moderation email fire-and-forget on success', async () => {
    await POST(makeReq('BadActor#9', { reason: 'harassment' }), { params: makeParams('BadActor#9') });
    const { sendModerationEmail } = jest.requireMock('@/lib/emailService') as { sendModerationEmail: jest.Mock };
    expect(sendModerationEmail).toHaveBeenCalledWith('BadActor#9', 'Darla#1', 'harassment');
  });

  it('still returns 201 if moderation email throws', async () => {
    (jest.requireMock('@/lib/emailService') as { sendModerationEmail: jest.Mock })
      .sendModerationEmail.mockRejectedValue(new Error('email fail'));
    const res = await POST(makeReq('BadActor#9', { reason: 'spam' }), { params: makeParams('BadActor#9') });
    expect(res.status).toBe(201);
  });
});
