jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/commentStore', () => ({
  getComments: jest.fn(),
  getCommentById: jest.fn(),
}));
jest.mock('@/lib/commentFlagStore', () => ({
  createCommentFlag: jest.fn(),
}));
jest.mock('@/lib/webhookService', () => ({
  sendCommentFlagWebhook: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/[id]/comments/[commentId]/flag/route';
import { getSession } from '@/lib/auth';
import { getCommentById } from '@/lib/commentStore';
import { createCommentFlag } from '@/lib/commentFlagStore';
import { sendCommentFlagWebhook } from '@/lib/webhookService';

const mockGetSession  = getSession            as jest.Mock;
const mockGetComment  = getCommentById        as jest.Mock;
const mockCreateFlag  = createCommentFlag     as jest.Mock;
const mockWebhook     = sendCommentFlagWebhook as jest.Mock;

const SESSION  = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const COMMENT  = { id: 'c1', reviewId: 'r1', authorTag: 'Player#99', body: 'Bad comment' };

function makeReq() {
  return new NextRequest('http://localhost/api/reviews/r1/comments/c1/flag', { method: 'POST' });
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/webhookService') as { sendCommentFlagWebhook: jest.Mock })
    .sendCommentFlagWebhook.mockResolvedValue(undefined);
});

describe('POST /api/reviews/[id]/comments/[commentId]/flag', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when comment does not exist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComment.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when user tries to flag their own comment', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComment.mockResolvedValue({ ...COMMENT, authorTag: 'Darla#1' });
    const res = await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own/i);
  });

  it('creates the flag and returns 200', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComment.mockResolvedValue(COMMENT);
    mockCreateFlag.mockResolvedValue({ id: 'cf1' });
    const res = await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(res.status).toBe(200);
    expect(mockCreateFlag).toHaveBeenCalledWith('c1', 'Darla#1');
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 409 when user has already flagged this comment', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComment.mockResolvedValue(COMMENT);
    const dupErr = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockCreateFlag.mockRejectedValue(dupErr);
    const res = await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(res.status).toBe(409);
  });

  it('fires a webhook alert on successful flag', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComment.mockResolvedValue(COMMENT);
    mockCreateFlag.mockResolvedValue({ id: 'cf1' });
    await POST(makeReq(), { params: { id: 'r1', commentId: 'c1' } });
    expect(mockWebhook).toHaveBeenCalledWith('c1', 'r1', 'Player#99', 'Darla#1');
  });
});
