jest.mock('@/lib/auth',             () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore',      () => ({ getReviewById: jest.fn() }));
jest.mock('@/lib/notificationStore',() => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/emailService',     () => ({ sendCommentEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/mentionService',   () => ({ notifyMentions: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/userStore',        () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/commentStore', () => ({
  createComment:            jest.fn(),
  getComments:              jest.fn(),
  getReplies:               jest.fn(),
  deleteComment:            jest.fn(),
  countComments:            jest.fn(),
  countRecentCommentsByTag: jest.fn(),
  updateComment:            jest.fn(),
  getCommentById:           jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/comments/route';
import { getReviewById } from '@/lib/reviewStore';
import { getReplies, getComments } from '@/lib/commentStore';

const mockGetReview  = getReviewById as jest.Mock;
const mockGetReplies = getReplies    as jest.Mock;
const mockGetComments = getComments  as jest.Mock;

const REVIEW  = { id: 'r1', reviewerTag: 'Author#9', gameTitle: 'Hades' };
const REPLY   = { id: 'c2', reviewId: 'r1', authorTag: 'Darla#1', body: 'Replying!', parentId: 'c0', createdAt: new Date().toISOString() };

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/reviews/r1/comments');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetReview.mockResolvedValue(REVIEW);
  mockGetReplies.mockResolvedValue([REPLY]);
  mockGetComments.mockResolvedValue([]);
  (jest.requireMock('@/lib/commentStore') as { countComments: jest.Mock })
    .countComments.mockResolvedValue(0);
  (jest.requireMock('@/lib/commentStore') as { getReplies: jest.Mock })
    .getReplies.mockResolvedValue([REPLY]);
});

describe('GET /api/reviews/[id]/comments — thread support', () => {
  it('returns replies when ?parentId= is provided', async () => {
    const res = await GET(makeReq({ parentId: 'c0' }), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].parentId).toBe('c0');
    expect(mockGetReplies).toHaveBeenCalledWith('c0', { skip: 0, take: 20 });
  });

  it('does not call getReplies when parentId is absent', async () => {
    await GET(makeReq(), { params: { id: 'r1' } });
    expect(mockGetReplies).not.toHaveBeenCalled();
    expect(mockGetComments).toHaveBeenCalled();
  });

  it('returns 404 when review not found', async () => {
    mockGetReview.mockResolvedValue(null);
    const res = await GET(makeReq({ parentId: 'c0' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('respects page and limit params for replies', async () => {
    await GET(makeReq({ parentId: 'c0', page: '2', limit: '5' }), { params: { id: 'r1' } });
    expect(mockGetReplies).toHaveBeenCalledWith('c0', { skip: 5, take: 5 });
  });
});
