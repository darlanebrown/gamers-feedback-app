jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

jest.mock('@/lib/commentStore', () => ({
  createComment: jest.fn(),
  getComments:   jest.fn(),
  deleteComment: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/reviews/[id]/comments/route';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { createComment, getComments, deleteComment } from '@/lib/commentStore';

const mockSession       = getSession     as jest.Mock;
const mockGetReview     = getReviewById  as jest.Mock;
const mockCreateComment = createComment  as jest.Mock;
const mockGetComments   = getComments    as jest.Mock;
const mockDeleteComment = deleteComment  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEW  = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99' };
const COMMENT = {
  id: 'c1', reviewId: 'r1', authorTag: 'Darla#1',
  body: 'Great review!', createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetComments.mockResolvedValue([COMMENT]);
  mockGetReview.mockResolvedValue(REVIEW);
  (jest.requireMock('@/lib/commentStore') as { createComment: jest.Mock })
    .createComment.mockResolvedValue(COMMENT);
  (jest.requireMock('@/lib/commentStore') as { deleteComment: jest.Mock })
    .deleteComment.mockResolvedValue(true);
});

function makeGetReq() {
  return new NextRequest('http://localhost/api/reviews/r1/comments');
}

function makePostReq(body: object) {
  return new NextRequest('http://localhost/api/reviews/r1/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq(commentId: string) {
  return new NextRequest(`http://localhost/api/reviews/r1/comments?commentId=${commentId}`, {
    method: 'DELETE',
  });
}

describe('GET /api/reviews/[id]/comments', () => {
  it('returns comments publicly without auth', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].body).toBe('Great review!');
  });

  it('returns 404 when review does not exist', async () => {
    mockGetReview.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('includes total comment count', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(typeof body.total).toBe('number');
  });
});

describe('POST /api/reviews/[id]/comments', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostReq({ body: 'Nice review!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review does not exist', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(null);
    const res = await POST(makePostReq({ body: 'Nice review!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when body is empty', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq({ body: '  ' }), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body exceeds 500 characters', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq({ body: 'x'.repeat(501) }), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('creates and returns the comment with 201', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makePostReq({ body: 'Great review!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.comment.body).toBe('Great review!');
    expect(mockCreateComment).toHaveBeenCalledWith('r1', 'Darla#1', 'Great review!');
  });
});

describe('DELETE /api/reviews/[id]/comments', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq('c1'), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when commentId is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/reviews/r1/comments', { method: 'DELETE' });
    const res = await DELETE(req, { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when comment does not belong to user', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockDeleteComment.mockResolvedValue(false);
    const res = await DELETE(makeDeleteReq('c1'), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('deletes comment and returns ok', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await DELETE(makeDeleteReq('c1'), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockDeleteComment).toHaveBeenCalledWith('c1', 'Darla#1');
  });
});
