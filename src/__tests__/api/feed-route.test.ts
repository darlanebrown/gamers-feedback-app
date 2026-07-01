jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/followStore', () => ({
  getFollowedTags: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTags: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/feed/route';
import { getSession } from '@/lib/auth';
import { getFollowedTags } from '@/lib/followStore';
import { getReviewsByTags } from '@/lib/reviewStore';

const mockSession   = getSession      as jest.Mock;
const mockGetTags   = getFollowedTags as jest.Mock;
const mockGetReviews = getReviewsByTags as jest.Mock;

const SESSION  = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const REVIEWS  = [
  { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99', rating: 9 },
  { id: 'r2', gameTitle: 'Hades',      reviewerTag: 'Gamer#42',  rating: 8 },
];

beforeEach(() => jest.resetAllMocks());

describe('GET /api/feed', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/feed'));
    expect(res.status).toBe(401);
  });

  it('returns empty reviews when following no one', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetTags.mockResolvedValue([]);
    mockGetReviews.mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost/api/feed'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toEqual([]);
  });

  it('returns reviews from followed users', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetTags.mockResolvedValue(['Player#99', 'Gamer#42']);
    mockGetReviews.mockResolvedValue(REVIEWS);

    const res = await GET(new NextRequest('http://localhost/api/feed'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(2);
    expect(mockGetReviews).toHaveBeenCalledWith(['Player#99', 'Gamer#42']);
  });

  it('response includes followedCount', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetTags.mockResolvedValue(['Player#99']);
    mockGetReviews.mockResolvedValue(REVIEWS);

    const res = await GET(new NextRequest('http://localhost/api/feed'));
    const body = await res.json();

    expect(body.followedCount).toBe(1);
  });
});
