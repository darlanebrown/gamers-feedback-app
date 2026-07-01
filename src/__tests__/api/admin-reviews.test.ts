jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/reviewStore', () => ({
  getAllReviews: jest.fn(),
  getReviewById: jest.fn(),
  updateReviewClassification: jest.fn(),
}));
jest.mock('@/lib/notificationStore', () => ({
  createNotification: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { GET  } from '@/app/api/admin/reviews/route';
import { PATCH } from '@/app/api/admin/reviews/[id]/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAllReviews, getReviewById, updateReviewClassification } from '@/lib/reviewStore';
import { createNotification } from '@/lib/notificationStore';

const mockGuard  = requireAdmin               as jest.Mock;
const mockGetAll = getAllReviews              as jest.Mock;
const mockGetOne = getReviewById             as jest.Mock;
const mockUpdate = updateReviewClassification as jest.Mock;
const mockNotify = createNotification         as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Great', body: 'Really enjoyed it.',
    pros: 'Combat', cons: 'Repetitive', playtime: '80h',
    reviewerTag: 'Darla#1', classification: 'helpful',
    classificationReason: null, createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const ADMIN_PASS  = null; // requireAdmin returns null → passes
const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

beforeEach(() => {
  jest.resetAllMocks();
  mockNotify.mockResolvedValue(undefined);
});

// ── GET /api/admin/reviews ────────────────────────────────────────────────────

describe('GET /api/admin/reviews', () => {
  it('blocks unauthenticated requests', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/reviews'));
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users', async () => {
    mockGuard.mockResolvedValue(FORBID_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/reviews'));
    expect(res.status).toBe(403);
  });

  it('returns all reviews for admin', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAll.mockResolvedValue([makeReview(), makeReview({ id: 'r2', classification: 'spam' })]);
    const res = await GET(new NextRequest('http://localhost/api/admin/reviews'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.reviews).toHaveLength(2);
  });

  it('filters by classification when ?filter= is provided', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAll.mockResolvedValue([
      makeReview({ classification: 'helpful' }),
      makeReview({ id: 'r2', classification: 'spam' }),
      makeReview({ id: 'r3', classification: 'pending' }),
    ]);
    const res = await GET(new NextRequest('http://localhost/api/admin/reviews?filter=pending'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].classification).toBe('pending');
  });
});

// ── PATCH /api/admin/reviews/[id] ────────────────────────────────────────────

describe('PATCH /api/admin/reviews/[id]', () => {
  it('blocks unauthenticated requests', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const req = new NextRequest('http://localhost/api/admin/reviews/r1', {
      method: 'PATCH', body: JSON.stringify({ classification: 'spam' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review not found', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/admin/reviews/bad', {
      method: 'PATCH', body: JSON.stringify({ classification: 'spam' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'bad' } });
    expect(res.status).toBe(404);
  });

  it('overrides classification and returns updated review', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeReview({ classification: 'helpful' }));
    mockUpdate.mockResolvedValue(undefined);
    const req = new NextRequest('http://localhost/api/admin/reviews/r1', {
      method: 'PATCH', body: JSON.stringify({ classification: 'spam', reason: 'Admin override' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('r1', 'spam', 'Admin override');
  });

  it('returns 400 for an invalid classification value', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetOne.mockResolvedValue(makeReview());
    const req = new NextRequest('http://localhost/api/admin/reviews/r1', {
      method: 'PATCH', body: JSON.stringify({ classification: 'nonsense' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'r1' } });
    expect(res.status).toBe(400);
  });
});
