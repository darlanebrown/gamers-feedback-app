jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
  updateReview:  jest.fn(),
  deleteReview:  jest.fn(),
}));
jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/reviews/[id]/route';
import { getReviewById, updateReview, deleteReview } from '@/lib/reviewStore';
import { getSession } from '@/lib/auth';

const mockGetById    = getReviewById  as jest.Mock;
const mockUpdate     = updateReview   as jest.Mock;
const mockDelete     = deleteReview   as jest.Mock;
const mockGetSession = getSession     as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', email: 'darla@example.com', role: 'user' };
const REVIEW  = { id: 'r1', reviewerTag: 'Darla#1', gameTitle: 'Elden Ring', classification: 'helpful' };

function req(method: string, body?: object) {
  return new NextRequest('http://localhost/api/reviews/r1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetById.mockResolvedValue(REVIEW);
  mockUpdate.mockResolvedValue({ ...REVIEW, headline: 'Updated', classification: 'pending' });
  mockDelete.mockResolvedValue(true);
});

describe('PATCH /api/reviews/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await PATCH(req('PATCH', { headline: 'X' }), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when updateReview returns null (not owner)', async () => {
    mockUpdate.mockResolvedValue(null);
    const res = await PATCH(req('PATCH', { headline: 'X' }), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('returns 200 with updated review on success', async () => {
    const res = await PATCH(req('PATCH', { headline: 'New headline' }), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.review).toBeDefined();
  });
});

describe('DELETE /api/reviews/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(req('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user does not own the review and is not admin', async () => {
    mockGetById.mockResolvedValue({ ...REVIEW, reviewerTag: 'Other#1' });
    const res = await DELETE(req('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(403);
  });

  it('returns 200 when owner deletes their review', async () => {
    const res = await DELETE(req('DELETE'), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
