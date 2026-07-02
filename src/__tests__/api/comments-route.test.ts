jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

jest.mock('@/lib/commentStore', () => ({
  createComment:              jest.fn(),
  getComments:                jest.fn(),
  deleteComment:              jest.fn(),
  countComments:              jest.fn(),
  countRecentCommentsByTag:   jest.fn(),
  updateComment:              jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendCommentEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/notificationStore', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/userStore', () => ({
  findUserByTag: jest.fn(),
}));

jest.mock('@/lib/mentionService', () => ({
  notifyMentions: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE, PATCH } from '@/app/api/reviews/[id]/comments/route';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { createComment, getComments, deleteComment, countComments, countRecentCommentsByTag, updateComment } from '@/lib/commentStore';
import { sendCommentEmail } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationStore';
import { findUserByTag } from '@/lib/userStore';

const mockSession                 = getSession                as jest.Mock;
const mockGetReview               = getReviewById             as jest.Mock;
const mockCreateComment           = createComment             as jest.Mock;
const mockGetComments             = getComments               as jest.Mock;
const mockDeleteComment           = deleteComment             as jest.Mock;
const mockCountComments           = countComments             as jest.Mock;
const mockCountRecentByTag        = countRecentCommentsByTag  as jest.Mock;
const mockUpdateComment           = updateComment             as jest.Mock;
const mockSendCommentEmail        = sendCommentEmail          as jest.Mock;
const mockCreateNotif             = createNotification        as jest.Mock;
const mockFindUserByTag           = findUserByTag             as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEW  = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99' };
const COMMENT = {
  id: 'c1', reviewId: 'r1', authorTag: 'Darla#1',
  body: 'Great review!', createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetComments.mockResolvedValue([COMMENT]);
  mockCountComments.mockResolvedValue(1);
  mockGetReview.mockResolvedValue(REVIEW);
  mockFindUserByTag.mockResolvedValue({ email: 'player99@test.com', gamerTag: 'Player#99' });
  const cs = jest.requireMock('@/lib/commentStore') as Record<string, jest.Mock>;
  cs.createComment.mockResolvedValue(COMMENT);
  cs.deleteComment.mockResolvedValue(true);
  cs.countRecentCommentsByTag.mockResolvedValue(0);
  cs.updateComment.mockResolvedValue({ ...COMMENT, body: 'Edited!' });
  (jest.requireMock('@/lib/emailService') as { sendCommentEmail: jest.Mock })
    .sendCommentEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/notificationStore') as { createNotification: jest.Mock })
    .createNotification.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/mentionService') as { notifyMentions: jest.Mock })
    .notifyMentions.mockResolvedValue(undefined);
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

function makePatchReq(commentId: string, body: object) {
  return new NextRequest(`http://localhost/api/reviews/r1/comments?commentId=${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

  it('includes total comment count independently of page size', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(typeof body.total).toBe('number');
  });

  it('returns page and limit in response', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(
      new NextRequest('http://localhost/api/reviews/r1/comments?page=2&limit=5'),
      { params: { id: 'r1' } },
    );
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(5);
  });

  it('uses default page=1 and limit=20 when not specified', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
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
    expect(mockCreateComment).toHaveBeenCalledWith('r1', 'Darla#1', 'Great review!', undefined);
  });

  it('fires a comment email to the review author', async () => {
    mockSession.mockResolvedValue(SESSION);
    await POST(makePostReq({ body: 'Great review!' }), { params: { id: 'r1' } });
    // allow fire-and-forget
    await Promise.resolve();
    expect(mockSendCommentEmail).toHaveBeenCalledWith(
      'player99@test.com', 'Darla#1', 'Elden Ring', 'r1',
    );
  });

  it('creates an in-app notification for the review author', async () => {
    mockSession.mockResolvedValue(SESSION);
    await POST(makePostReq({ body: 'Great review!' }), { params: { id: 'r1' } });
    await Promise.resolve();
    expect(mockCreateNotif).toHaveBeenCalledWith(
      'Player#99', 'comment', 'Darla#1', 'r1', 'Elden Ring',
    );
  });

  it('does not notify when the commenter is the review author', async () => {
    mockSession.mockResolvedValue({ ...SESSION, gamerTag: 'Player#99' });
    await POST(makePostReq({ body: 'My own review!' }), { params: { id: 'r1' } });
    await Promise.resolve();
    expect(mockSendCommentEmail).not.toHaveBeenCalled();
    expect(mockCreateNotif).not.toHaveBeenCalled();
  });

  it('returns 429 when user exceeds 10 comments per hour', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockCountRecentByTag.mockResolvedValue(10);
    const res = await POST(makePostReq({ body: 'One more!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.retryAfter).toBe(3600);
  });

  it('allows comment when user is under the rate limit', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockCountRecentByTag.mockResolvedValue(9);
    const res = await POST(makePostReq({ body: 'Still allowed!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(201);
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

describe('PATCH /api/reviews/[id]/comments', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makePatchReq('c1', { body: 'Edited!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when commentId is missing', async () => {
    mockSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/reviews/r1/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Edited!' }),
    });
    const res = await PATCH(req, { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await PATCH(makePatchReq('c1', { body: '  ' }), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body exceeds 500 characters', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await PATCH(makePatchReq('c1', { body: 'x'.repeat(501) }), { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when comment does not belong to user', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockUpdateComment.mockResolvedValue(null);
    const res = await PATCH(makePatchReq('c1', { body: 'Edited!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('updates the comment and returns it with 200', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await PATCH(makePatchReq('c1', { body: 'Edited!' }), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.comment.body).toBe('Edited!');
    expect(mockUpdateComment).toHaveBeenCalledWith('c1', 'Darla#1', 'Edited!');
  });
});
