jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/adminStatsService', () => ({
  getAdminStats: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/admin/stats/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAdminStats } from '@/lib/adminStatsService';

const mockGuard    = requireAdmin   as jest.Mock;
const mockGetStats = getAdminStats  as jest.Mock;

const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' }, { status: 403 });

const SAMPLE_STATS = {
  users:        { total: 120, banned: 3 },
  reviews:      { total: 450, helpful: 380, spam: 40, toxic: 15, pending: 15 },
  flags:        { pending: 7 },
  comments:     { total: 890 },
};

beforeEach(() => jest.resetAllMocks());

describe('GET /api/admin/stats', () => {
  it('returns 401 when not authenticated', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockGuard.mockResolvedValue(FORBID_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(res.status).toBe(403);
  });

  it('returns aggregated stats for admin', async () => {
    mockGuard.mockResolvedValue(null);
    mockGetStats.mockResolvedValue(SAMPLE_STATS);
    const res = await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.users.total).toBe(120);
    expect(body.stats.users.banned).toBe(3);
    expect(body.stats.reviews.helpful).toBe(380);
    expect(body.stats.flags.pending).toBe(7);
    expect(body.stats.comments.total).toBe(890);
  });

  it('calls getAdminStats once', async () => {
    mockGuard.mockResolvedValue(null);
    mockGetStats.mockResolvedValue(SAMPLE_STATS);
    await GET(new NextRequest('http://localhost/api/admin/stats'));
    expect(mockGetStats).toHaveBeenCalledTimes(1);
  });
});
