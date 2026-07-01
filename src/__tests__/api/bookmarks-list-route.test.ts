jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/bookmarkStore', () => ({
  getBookmarks:   jest.fn(),
  countBookmarks: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/bookmarks/route';
import { getSession } from '@/lib/auth';
import { getBookmarks, countBookmarks } from '@/lib/bookmarkStore';
import { getReviewById } from '@/lib/reviewStore';

const mockSession       = getSession      as jest.Mock;
const mockGetBookmarks  = getBookmarks    as jest.Mock;
const mockCountBookmarks = countBookmarks as jest.Mock;
const mockGetReviewById = getReviewById   as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

const BOOKMARKS = [
  { id: 'b1', reviewId: 'r1', bookmarkerTag: 'Darla#1', createdAt: new Date() },
  { id: 'b2', reviewId: 'r2', bookmarkerTag: 'Darla#1', createdAt: new Date() },
];

const REVIEW = {
  id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99',
  classification: 'helpful', rating: 9,
};

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/bookmarkStore') as { getBookmarks: jest.Mock })
    .getBookmarks.mockResolvedValue(BOOKMARKS);
  (jest.requireMock('@/lib/bookmarkStore') as { countBookmarks: jest.Mock })
    .countBookmarks.mockResolvedValue(2);
  mockGetReviewById.mockResolvedValue(REVIEW);
});

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/bookmarks${query}`);
}

describe('GET /api/bookmarks', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns bookmarked review ids and total for current user', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookmarks).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('calls getBookmarks with the current user gamerTag', async () => {
    mockSession.mockResolvedValue(SESSION);
    await GET(makeReq());
    expect(mockGetBookmarks).toHaveBeenCalledWith('Darla#1');
  });

  it('returns empty list when user has no bookmarks', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetBookmarks.mockResolvedValue([]);
    mockCountBookmarks.mockResolvedValue(0);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.bookmarks).toEqual([]);
    expect(body.total).toBe(0);
  });
});
