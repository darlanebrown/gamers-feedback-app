jest.mock('@/lib/featuredReviewStore', () => ({
  getFeaturedReview: jest.fn(),
  setFeaturedReview: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

jest.mock('@/lib/securityLogger', () => ({ logSecurityEvent: jest.fn() }));

jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/featured/route';
import { POST } from '@/app/api/admin/featured/route';
import { getFeaturedReview, setFeaturedReview } from '@/lib/featuredReviewStore';
import { getSession } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/securityLogger';
import { getReviewById } from '@/lib/reviewStore';

const mockGetFeatured  = getFeaturedReview  as jest.Mock;
const mockSetFeatured  = setFeaturedReview  as jest.Mock;
const mockGetSession   = getSession         as jest.Mock;
const mockLogSecurity  = logSecurityEvent   as jest.Mock;
const mockGetReviewById = getReviewById     as jest.Mock;

const ADMIN_SESSION = { gamerTag: 'Admin#1', role: 'admin' };
const USER_SESSION  = { gamerTag: 'User#1',  role: 'user' };

const SAMPLE_REVIEW = {
  id: 'rev1', gameTitle: 'Elden Ring', platform: 'PC', rating: 10,
  headline: 'Best game ever', body: 'Masterpiece.', reviewerTag: 'User#1',
  classification: 'helpful', hasSpoilers: false, createdAt: '2026-07-01T00:00:00.000Z',
};

function makeReq(url: string, opts: RequestInit = {}) {
  return new NextRequest(url, opts);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSetFeatured.mockResolvedValue(undefined);
  mockLogSecurity.mockReturnValue(undefined);
});

describe('GET /api/reviews/featured', () => {
  it('returns 404 when no featured review is set', async () => {
    mockGetFeatured.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns the featured review', async () => {
    mockGetFeatured.mockResolvedValue(SAMPLE_REVIEW);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.review.id).toBe('rev1');
    expect(body.review.gameTitle).toBe('Elden Ring');
  });
});

describe('POST /api/admin/featured', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    mockGetSession.mockResolvedValue(USER_SESSION);
    const res = await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when reviewId is missing', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    const res = await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when review does not exist', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReviewById.mockResolvedValue(null);
    const res = await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({ reviewId: 'nonexistent' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('sets the featured review and returns 200', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    const res = await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reviewId).toBe('rev1');
    expect(mockSetFeatured).toHaveBeenCalledWith('rev1', 'Admin#1');
  });

  it('logs admin_feature_review security event', async () => {
    mockGetSession.mockResolvedValue(ADMIN_SESSION);
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    await POST(
      makeReq('http://localhost/api/admin/featured', {
        method: 'POST', body: JSON.stringify({ reviewId: 'rev1' }),
      }),
    );
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'admin_feature_review',
      'Admin#1',
      'rev1',
    );
  });
});
