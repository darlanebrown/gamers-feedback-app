jest.mock('@/lib/adminMiddleware', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/alertService', () => ({
  getActiveAlerts: jest.fn(),
  dismissAlert: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/admin/alerts/route';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getActiveAlerts } from '@/lib/alertService';

const mockGuard        = requireAdmin    as jest.Mock;
const mockGetAlerts    = getActiveAlerts as jest.Mock;

const ADMIN_PASS  = null;
const UNAUTH_FAIL = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
const FORBID_FAIL = NextResponse.json({ error: 'Forbidden' },        { status: 403 });

const ALERTS = [
  { id: 'a1', type: 'review_bombing', gameTitle: 'Cyberpunk 2077', count: 6, dismissed: false, detectedAt: new Date().toISOString(), dismissedAt: null },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockGetAlerts.mockResolvedValue(ALERTS);
});

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

  it('returns active alerts for admin', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].gameTitle).toBe('Cyberpunk 2077');
  });

  it('returns empty list when no active alerts', async () => {
    mockGuard.mockResolvedValue(ADMIN_PASS);
    mockGetAlerts.mockResolvedValue([]);
    const res = await GET(new NextRequest('http://localhost/api/admin/alerts'));
    const body = await res.json();
    expect(body.alerts).toHaveLength(0);
  });
});
