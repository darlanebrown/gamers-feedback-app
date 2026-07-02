jest.mock('@/lib/pinnedReviewStore', () => ({
  getPinnedReview: jest.fn(),
  setPinnedReview: jest.fn(),
  clearPinnedReview: jest.fn(),
}));

jest.mock('@/lib/auth',        () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore', () => ({ getReviewById: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/pinned/route';
import { PUT } from '@/app/api/profile/[tag]/pin/route';
import { getPinnedReview, setPinnedReview, clearPinnedReview } from '@/lib/pinnedReviewStore';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';

const mockGetPinned   = getPinnedReview   as jest.Mock;
const mockSetPinned   = setPinnedReview   as jest.Mock;
const mockClearPinned = clearPinnedReview as jest.Mock;
const mockGetSession  = getSession        as jest.Mock;
const mockGetReview   = getReviewById     as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

const SAMPLE_REVIEW = {
  id: 'rev1', gameTitle: 'Hades', reviewerTag: 'Darla#1',
  classification: 'helpful', hasSpoilers: false,
};

function makeParams(tag: string) {
  return Promise.resolve({ tag });
}

function makeReq(url: string, opts: RequestInit = {}) {
  return new NextRequest(url, opts);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSetPinned.mockResolvedValue(undefined);
  mockClearPinned.mockResolvedValue(undefined);
});

describe('GET /api/profile/[tag]/pinned', () => {
  it('returns 404 when no review is pinned', async () => {
    mockGetPinned.mockResolvedValue(null);
    const res = await GET(
      makeReq('http://localhost/api/profile/Darla%231/pinned'),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(404);
  });

  it('returns the pinned review', async () => {
    mockGetPinned.mockResolvedValue(SAMPLE_REVIEW);
    const res = await GET(
      makeReq('http://localhost/api/profile/Darla%231/pinned'),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.review.id).toBe('rev1');
    expect(body.review.gameTitle).toBe('Hades');
  });
});

describe('PUT /api/profile/[tag]/pin', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when pinning another user\'s profile', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Other#1', role: 'user' });
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when review does not exist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(null);
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: 'bad-id' }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 when pinning a review that belongs to another user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue({ ...SAMPLE_REVIEW, reviewerTag: 'Other#1' });
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(403);
  });

  it('pins a review and returns 200', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReview.mockResolvedValue(SAMPLE_REVIEW);
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(200);
    expect(mockSetPinned).toHaveBeenCalledWith('Darla#1', 'rev1');
  });

  it('clears pin when reviewId is null', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const res = await PUT(
      makeReq('http://localhost/api/profile/Darla%231/pin', {
        method: 'PUT', body: JSON.stringify({ reviewId: null }),
      }),
      { params: makeParams('Darla#1') },
    );
    expect(res.status).toBe(200);
    expect(mockClearPinned).toHaveBeenCalledWith('Darla#1');
    expect(mockSetPinned).not.toHaveBeenCalled();
  });
});
