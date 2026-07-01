jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

jest.mock('@/lib/bookmarkStore', () => ({
  addBookmark:    jest.fn(),
  removeBookmark: jest.fn(),
  isBookmarked:   jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST, DELETE, GET } from '@/app/api/reviews/[id]/bookmark/route';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';
import { addBookmark, removeBookmark, isBookmarked } from '@/lib/bookmarkStore';

const mockSession      = getSession      as jest.Mock;
const mockGetReview    = getReviewById   as jest.Mock;
const mockAdd          = addBookmark     as jest.Mock;
const mockRemove       = removeBookmark  as jest.Mock;
const mockIsBookmarked = isBookmarked    as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEW  = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99' };

function makeReq(method = 'POST') {
  return new NextRequest('http://localhost/api/reviews/r1/bookmark', { method });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetReview.mockResolvedValue(REVIEW);
  (jest.requireMock('@/lib/bookmarkStore') as { addBookmark: jest.Mock })
    .addBookmark.mockResolvedValue({ id: 'b1' });
  (jest.requireMock('@/lib/bookmarkStore') as { isBookmarked: jest.Mock })
    .isBookmarked.mockResolvedValue(false);
});

describe('POST /api/reviews/[id]/bookmark', () => {
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

  it('adds bookmark and returns bookmarked:true', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookmarked).toBe(true);
    expect(mockAdd).toHaveBeenCalledWith('r1', 'Darla#1');
  });

  it('returns 409 when already bookmarked', async () => {
    mockSession.mockResolvedValue(SESSION);
    const dupError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockAdd.mockRejectedValue(dupError);
    const res = await POST(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/reviews/[id]/bookmark', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('removes bookmark and returns bookmarked:false', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockRemove.mockResolvedValue(undefined);
    const res = await DELETE(makeReq('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookmarked).toBe(false);
    expect(mockRemove).toHaveBeenCalledWith('r1', 'Darla#1');
  });
});

describe('GET /api/reviews/[id]/bookmark', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq('GET'), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns bookmarked:true when bookmark exists', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockIsBookmarked.mockResolvedValue(true);
    const res = await GET(makeReq('GET'), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookmarked).toBe(true);
  });

  it('returns bookmarked:false when no bookmark', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockIsBookmarked.mockResolvedValue(false);
    const res = await GET(makeReq('GET'), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.bookmarked).toBe(false);
  });
});
