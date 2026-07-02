jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/commentStore', () => ({
  getComments: jest.fn(),
}));

jest.mock('@/lib/commentVoteStore', () => ({
  upsertCommentVote:    jest.fn(),
  removeCommentVote:    jest.fn(),
  getCommentVoteCounts: jest.fn(),
  getUserCommentVote:   jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST, DELETE, GET } from '@/app/api/reviews/[id]/comments/[commentId]/vote/route';
import { getSession } from '@/lib/auth';
import { upsertCommentVote, removeCommentVote, getCommentVoteCounts, getUserCommentVote } from '@/lib/commentVoteStore';

const mockSession          = getSession          as jest.Mock;
const mockUpsert           = upsertCommentVote   as jest.Mock;
const mockRemove           = removeCommentVote   as jest.Mock;
const mockGetCounts        = getCommentVoteCounts as jest.Mock;
const mockGetUserVote      = getUserCommentVote   as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

beforeEach(() => {
  jest.resetAllMocks();
  const cvs = jest.requireMock('@/lib/commentVoteStore') as Record<string, jest.Mock>;
  cvs.upsertCommentVote.mockResolvedValue({ commentId: 'c1', voterTag: 'Darla#1', type: 'up' });
  cvs.removeCommentVote.mockResolvedValue(undefined);
  cvs.getCommentVoteCounts.mockResolvedValue({ up: 3, down: 1 });
  cvs.getUserCommentVote.mockResolvedValue(null);
});

function makeCtx() {
  return { params: { id: 'r1', commentId: 'c1' } };
}

function makePostReq(type: string) {
  return new NextRequest('http://localhost/api/reviews/r1/comments/c1/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/reviews/r1/comments/c1/vote', {
    method: 'DELETE',
  });
}

function makeGetReq() {
  return new NextRequest('http://localhost/api/reviews/r1/comments/c1/vote');
}

describe('GET /api/reviews/[id]/comments/[commentId]/vote', () => {
  it('returns vote counts without auth', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq(), makeCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ up: 3, down: 1, userVote: null });
  });

  it('includes userVote when authenticated', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetUserVote.mockResolvedValue('up');
    const res = await GET(makeGetReq(), makeCtx());
    const body = await res.json();
    expect(body.userVote).toBe('up');
  });
});

describe('POST /api/reviews/[id]/comments/[commentId]/vote', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostReq('up'), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid vote type', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq('meh'), makeCtx());
    expect(res.status).toBe(400);
  });

  it('upserts an upvote and returns counts', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq('up'), makeCtx());
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith('c1', 'Darla#1', 'up');
    const body = await res.json();
    expect(body).toMatchObject({ up: expect.any(Number), down: expect.any(Number) });
  });

  it('upserts a downvote', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq('down'), makeCtx());
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith('c1', 'Darla#1', 'down');
  });
});

describe('DELETE /api/reviews/[id]/comments/[commentId]/vote', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it('removes the vote and returns updated counts', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeDeleteReq(), makeCtx());
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith('c1', 'Darla#1');
    const body = await res.json();
    expect(body).toMatchObject({ up: expect.any(Number), down: expect.any(Number) });
  });
});
