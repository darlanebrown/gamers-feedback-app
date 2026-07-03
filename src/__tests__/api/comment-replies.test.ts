jest.mock('@/lib/auth',             () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore',      () => ({ getReviewById: jest.fn() }));
jest.mock('@/lib/commentNotificationService', () => ({
  notifyCommentOnReview: jest.fn().mockResolvedValue(undefined),
  notifyReplyToComment:  jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/emailService',     () => ({ sendCommentEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/mentionService',   () => ({ notifyMentions: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/userStore',        () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/commentStore', () => ({
  createComment:            jest.fn(),
  getComments:              jest.fn(),
  deleteComment:            jest.fn(),
  countComments:            jest.fn(),
  countRecentCommentsByTag: jest.fn(),
  updateComment:            jest.fn(),
  getCommentById:           jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/[id]/comments/route';
import { getSession }           from '@/lib/auth';
import { getReviewById }        from '@/lib/reviewStore';
import { notifyReplyToComment } from '@/lib/commentNotificationService';
import { getCommentById }       from '@/lib/commentStore';

const mockSession         = getSession           as jest.Mock;
const mockGetReview       = getReviewById        as jest.Mock;
const mockGetCommentById  = getCommentById       as jest.Mock;
const mockNotifyReply     = notifyReplyToComment as jest.Mock;

const SESSION     = { gamerTag: 'Darla#1', role: 'user' };
const REVIEW      = { id: 'r1', reviewerTag: 'Author#9', gameTitle: 'Hades' };
const PARENT      = { id: 'c0', reviewId: 'r1', authorTag: 'Bob#2', body: 'First!', createdAt: new Date().toISOString() };
const NEW_COMMENT = { id: 'c1', reviewId: 'r1', authorTag: 'Darla#1', body: 'Replying!', parentId: 'c0', createdAt: new Date().toISOString() };

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/reviews/r1/comments', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGetReview.mockResolvedValue(REVIEW);
  mockGetCommentById.mockResolvedValue(PARENT);
  mockNotifyReply.mockResolvedValue(undefined);
  const cs = jest.requireMock('@/lib/commentStore') as Record<string, jest.Mock>;
  cs.createComment.mockResolvedValue(NEW_COMMENT);
  cs.countRecentCommentsByTag.mockResolvedValue(0);
  (jest.requireMock('@/lib/commentNotificationService') as { notifyCommentOnReview: jest.Mock; notifyReplyToComment: jest.Mock })
    .notifyCommentOnReview.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/commentNotificationService') as { notifyCommentOnReview: jest.Mock; notifyReplyToComment: jest.Mock })
    .notifyReplyToComment.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendCommentEmail: jest.Mock })
    .sendCommentEmail.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/mentionService') as { notifyMentions: jest.Mock })
    .notifyMentions.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/userStore') as { findUserByTag: jest.Mock })
    .findUserByTag.mockResolvedValue({ email: 'author@test.com', gamerTag: 'Author#9' });
});

describe('POST /api/reviews/[id]/comments — replies', () => {
  it('creates a reply with parentId when parentId is provided', async () => {
    const res = await POST(makeReq({ body: 'Replying!', parentId: 'c0' }), { params: { id: 'r1' } });
    expect(res.status).toBe(201);
    const cs = jest.requireMock('@/lib/commentStore') as Record<string, jest.Mock>;
    expect(cs.createComment).toHaveBeenCalledWith('r1', 'Darla#1', 'Replying!', 'c0');
  });

  it('returns 404 when parentId does not match an existing comment', async () => {
    mockGetCommentById.mockResolvedValue(null);
    const res = await POST(makeReq({ body: 'Replying!', parentId: 'bad-id' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('fires preference-gated reply notification when replier is different user', async () => {
    await POST(makeReq({ body: 'Replying!', parentId: 'c0' }), { params: { id: 'r1' } });
    expect(mockNotifyReply).toHaveBeenCalledWith('Bob#2', 'Darla#1', 'r1');
  });

  it('does not notify parent author when replying to own comment', async () => {
    mockGetCommentById.mockResolvedValue({ ...PARENT, authorTag: 'Darla#1' });
    await POST(makeReq({ body: 'Replying!', parentId: 'c0' }), { params: { id: 'r1' } });
    expect(mockNotifyReply).not.toHaveBeenCalled();
  });

  it('creates a plain comment when no parentId is given', async () => {
    const cs = jest.requireMock('@/lib/commentStore') as Record<string, jest.Mock>;
    cs.createComment.mockResolvedValue({ ...NEW_COMMENT, parentId: null });
    const res = await POST(makeReq({ body: 'Just a comment' }), { params: { id: 'r1' } });
    expect(res.status).toBe(201);
    expect(cs.createComment).toHaveBeenCalledWith('r1', 'Darla#1', 'Just a comment', undefined);
  });
});
