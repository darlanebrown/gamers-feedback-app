jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/voteStore', () => ({
  upsertVote: jest.fn(),
  removeVote: jest.fn(),
  getVoteCounts: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/reviews/[id]/vote/route';
import { getSession } from '@/lib/auth';
import { upsertVote, removeVote, getVoteCounts } from '@/lib/voteStore';
import { getReviewById } from '@/lib/reviewStore';

const mockSession     = getSession     as jest.Mock;
const mockUpsertVote  = upsertVote     as jest.Mock;
const mockRemoveVote  = removeVote     as jest.Mock;
const mockGetCounts   = getVoteCounts  as jest.Mock;
const mockGetReview   = getReviewById  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEW  = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99' };

beforeEach(() => {
  jest.resetAllMocks();
  mockGetCounts.mockResolvedValue({ up: 3, down: 1 });
});

function makeReq(method: string, body?: object) {
  return new NextRequest('http://localhost/api/reviews/r1/vote', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/reviews/[id]/vote', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq('POST', { type: 'up' }), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review does not exist', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(null);
    const res = await POST(makeReq('POST', { type: 'up' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid vote type', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(REVIEW);
    const res = await POST(makeReq('POST', { type: 'sideways' }), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('upserts vote and returns updated counts', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(REVIEW);
    mockUpsertVote.mockResolvedValue({ type: 'up' });

    const res = await POST(makeReq('POST', { type: 'up' }), { params: { id: 'r1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpsertVote).toHaveBeenCalledWith('r1', 'Darla#1', 'up');
    expect(body.votes).toEqual({ up: 3, down: 1 });
  });
});

describe('DELETE /api/reviews/[id]/vote', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('removes vote and returns updated counts', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockRemoveVote.mockResolvedValue({});

    const res = await DELETE(makeReq('DELETE'), { params: { id: 'r1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRemoveVote).toHaveBeenCalledWith('r1', 'Darla#1');
    expect(body.votes).toEqual({ up: 3, down: 1 });
  });
});
