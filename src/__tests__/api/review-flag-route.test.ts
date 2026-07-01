jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendFlagEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/webhookService', () => ({
  sendFlagWebhook: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/flagStore', () => ({
  createFlag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/[id]/flag/route';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { sendFlagEmail } from '@/lib/emailService';
import { sendFlagWebhook } from '@/lib/webhookService';
import { createFlag } from '@/lib/flagStore';

const mockSession     = getSession      as jest.Mock;
const mockGetReview   = getReviewById   as jest.Mock;
const mockFlagEmail   = sendFlagEmail   as jest.Mock;
const mockFlagWebhook = sendFlagWebhook as jest.Mock;
const mockCreateFlag  = createFlag      as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEW  = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99' };

function makeReq() {
  return new NextRequest('http://localhost/api/reviews/r1/flag', { method: 'POST' });
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/emailService')   as { sendFlagEmail: jest.Mock })
    .sendFlagEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/webhookService') as { sendFlagWebhook: jest.Mock })
    .sendFlagWebhook.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/flagStore') as { createFlag: jest.Mock })
    .createFlag.mockResolvedValue({ id: 'f1' });
});

describe('POST /api/reviews/[id]/flag', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review does not exist', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when user tries to flag their own review', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue({ ...REVIEW, reviewerTag: 'Darla#1' });
    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own/i);
  });

  it('persists the flag via createFlag', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(REVIEW);

    await POST(makeReq(), { params: { id: 'r1' } });

    expect(mockCreateFlag).toHaveBeenCalledWith('r1', 'Darla#1');
  });

  it('returns 409 when the user has already flagged this review', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(REVIEW);
    const dupError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockCreateFlag.mockRejectedValue(dupError);

    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already/i);
  });

  it('fires email and webhook alerts on successful flag', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(REVIEW);

    const res = await POST(makeReq(), { params: { id: 'r1' } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(mockFlagEmail).toHaveBeenCalledWith('r1', 'Elden Ring', 'Player#99', 'Darla#1');
    expect(mockFlagWebhook).toHaveBeenCalledWith('r1', 'Elden Ring', 'Player#99', 'Darla#1');
  });
});
