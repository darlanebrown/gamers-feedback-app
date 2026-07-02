jest.mock('@/lib/auth', () => ({ getSession: jest.fn(), SESSION_COOKIE: 'gf_session' }));
jest.mock('@/lib/commentStore', () => ({
  createComment: jest.fn(),
  getComments: jest.fn(),
  deleteComment: jest.fn(),
  getCommentsByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/comments/mine/route';
import { getSession } from '@/lib/auth';
import { getCommentsByTag } from '@/lib/commentStore';

const mockGetSession  = getSession        as jest.Mock;
const mockGetComments = getCommentsByTag  as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

function makeComment(overrides = {}) {
  return {
    id: 'c1', reviewId: 'r1', authorTag: 'Darla#1',
    body: 'Great review!', gameTitle: 'Hades',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/comments/mine${query}`);
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/comments/mine', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns the comment history for the authenticated user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComments.mockResolvedValue([makeComment(), makeComment({ id: 'c2', reviewId: 'r2' })]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(mockGetComments).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20 });
    const body = await res.json();
    expect(body.comments).toHaveLength(2);
    expect(body.comments[0].gameTitle).toBe('Hades');
  });

  it('supports pagination via ?page and ?limit', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComments.mockResolvedValue([]);
    await GET(makeReq('?page=2&limit=10'));
    expect(mockGetComments).toHaveBeenCalledWith('Darla#1', { skip: 10, take: 10 });
  });

  it('returns an empty array when user has no comments', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetComments.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.comments).toEqual([]);
  });
});
