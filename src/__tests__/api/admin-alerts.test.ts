jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/reviewStore', () => ({
  getRecentNegativeReviewCounts: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/admin/alerts/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getRecentNegativeReviewCounts } from '@/lib/reviewStore';

const mockGuard   = requireAdmin                  as jest.Mock;
const mockCounts  = getRecentNegativeReviewCounts as jest.Mock;

const ADMIN_PASS  = null;
const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' },        { status: 403 });

const BOMB_THRESHOLD = 10;

beforeEach(() => jest.resetAllMocks());

describe('GET /api/admin/alerts', () => {
  it('blocks unauthenticated requests', async () => {
    mockGuard.mockResolvedValue(UNAUTH_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    expect(res.status).toBe(401);
  });

  it('blocks non-admin users', async () => {
    mockGuard.mockResolvedValue(FORBID_FAIL);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    expect(res.status).toBe(403);
  });

  it('returns only games that meet the bomb threshold', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockCounts.mockResolvedValue([
      { gameTitle: 'Cyberpunk 2077', count: BOMB_THRESHOLD + 5 },
      { gameTitle: 'Hades', count: 3 },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    const body = await res.json();
    expect(res.status).toBe(200);
    const titles = body.alerts.map((a: { gameTitle: string }) => a.gameTitle);
    expect(titles).toContain('Cyberpunk 2077');
    expect(titles).not.toContain('Hades');
  });

  it('returns empty list when no games are being bombed', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockCounts.mockResolvedValue([{ gameTitle: 'Hades', count: 2 }]);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    const body = await res.json();
    expect(body.alerts).toHaveLength(0);
  });

  it('response includes negativeCount and isBombing fields', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockCounts.mockResolvedValue([{ gameTitle: 'Fortnite', count: BOMB_THRESHOLD + 2 }]);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    const body = await res.json();
    expect(body.alerts[0]).toMatchObject({
      gameTitle: 'Fortnite',
      negativeCount: BOMB_THRESHOLD + 2,
      isBombing: true,
    });
  });
});
