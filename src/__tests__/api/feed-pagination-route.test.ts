jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/followStore', () => ({
  getFollowedTags: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTags:   jest.fn(),
  countReviewsByTags: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/feed/route';
import { getSession } from '@/lib/auth';
import { getFollowedTags } from '@/lib/followStore';
import { getReviewsByTags, countReviewsByTags } from '@/lib/reviewStore';

const mockSession    = getSession          as jest.Mock;
const mockGetTags    = getFollowedTags     as jest.Mock;
const mockGetReviews = getReviewsByTags    as jest.Mock;
const mockCount      = countReviewsByTags  as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1' };
const TAGS    = ['Player#99', 'Gamer#42'];

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGetTags.mockResolvedValue(TAGS);
  mockGetReviews.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
});

function req(params = '') {
  return new NextRequest(`http://localhost/api/feed${params}`);
}

describe('GET /api/feed — pagination', () => {
  it('defaults to page 1, limit 10', async () => {
    await GET(req());
    expect(mockGetReviews).toHaveBeenCalledWith(TAGS, { skip: 0, take: 10 });
  });

  it('passes correct skip/take for page 2 limit 5', async () => {
    await GET(req('?page=2&limit=5'));
    expect(mockGetReviews).toHaveBeenCalledWith(TAGS, { skip: 5, take: 5 });
  });

  it('response includes total count', async () => {
    mockCount.mockResolvedValue(23);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(23);
    expect(mockCount).toHaveBeenCalledWith(TAGS);
  });

  it('response includes page and limit', async () => {
    const res = await GET(req('?page=3&limit=5'));
    const body = await res.json();
    expect(body.page).toBe(3);
    expect(body.limit).toBe(5);
  });
});
