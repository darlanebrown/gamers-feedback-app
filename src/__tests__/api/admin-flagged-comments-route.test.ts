jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/commentFlagStore', () => ({
  createCommentFlag: jest.fn(),
  countCommentFlags: jest.fn(),
  getFlaggedComments: jest.fn(),
  dismissCommentFlags: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET, DELETE } from '@/app/api/admin/comments/flagged/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getFlaggedComments, dismissCommentFlags } from '@/lib/commentFlagStore';

const mockGuard   = requireAdmin       as jest.Mock;
const mockGetAll  = getFlaggedComments  as jest.Mock;
const mockDismiss = dismissCommentFlags as jest.Mock;

const ADMIN_PASS  = null;
const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' },         { status: 403 });

function makeFlaggedComment(overrides = {}) {
  return {
    commentId: 'c1', flagCount: 3,
    body: 'Bad content', authorTag: 'Troll#99', reviewId: 'r1',
    ...overrides,
  };
}

beforeEach(() => jest.resetAllMocks());

// ── GET /api/admin/comments/flagged ───────────────────────────────────────────

describe('GET /api/admin/comments/flagged', () => {
  it('returns 401 when not authenticated', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/comments/flagged'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGuard.mockResolvedValue(FORBID_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/comments/flagged'));
    expect(res.status).toBe(403);
  });

  it('returns flagged comments ordered by flag count', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAll.mockResolvedValue([
      makeFlaggedComment({ flagCount: 5 }),
      makeFlaggedComment({ commentId: 'c2', flagCount: 2 }),
    ]);
    const res = await GET(new NextRequest('http://localhost/api/admin/comments/flagged'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flaggedComments).toHaveLength(2);
    expect(body.flaggedComments[0].flagCount).toBe(5);
  });
});

// ── DELETE /api/admin/comments/flagged ────────────────────────────────────────

describe('DELETE /api/admin/comments/flagged', () => {
  it('returns 401 when not authenticated', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const req = new NextRequest('http://localhost/api/admin/comments/flagged', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: 'c1' }),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when commentId is missing', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    const req = new NextRequest('http://localhost/api/admin/comments/flagged', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('dismisses all flags for a comment and returns 200', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockDismiss.mockResolvedValue(3);
    const req = new NextRequest('http://localhost/api/admin/comments/flagged', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: 'c1' }),
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockDismiss).toHaveBeenCalledWith('c1');
    const body = await res.json();
    expect(body.dismissed).toBe(3);
  });
});
