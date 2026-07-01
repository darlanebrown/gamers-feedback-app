jest.mock('@/lib/alertService', () => ({
  getActiveAlerts: jest.fn(),
  dismissAlert: jest.fn(),
}));

jest.mock('@/lib/adminMiddleware', () => ({
  requireAdmin: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/alerts/route';
import { PATCH } from '@/app/api/admin/alerts/[id]/route';
import { getActiveAlerts, dismissAlert } from '@/lib/alertService';
import { requireAdmin } from '@/lib/adminMiddleware';

const mockRequireAdmin = requireAdmin as jest.Mock;
const mockGetActiveAlerts = getActiveAlerts as jest.Mock;
const mockDismissAlert = dismissAlert as jest.Mock;

const ALERTS = [
  { id: 'a1', type: 'review_bombing', gameTitle: 'Elden Ring', count: 5, dismissed: false, detectedAt: new Date().toISOString(), dismissedAt: null },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireAdmin.mockResolvedValue(null);
  mockGetActiveAlerts.mockResolvedValue(ALERTS);
  mockDismissAlert.mockResolvedValue({ ...ALERTS[0], dismissed: true, dismissedAt: new Date().toISOString() });
});

describe('GET /api/admin/alerts', () => {
  it('returns 401 when requireAdmin returns a response', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const req = new NextRequest('http://localhost/api/admin/alerts');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns active alerts for admin', async () => {
    const req = new NextRequest('http://localhost/api/admin/alerts');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].gameTitle).toBe('Elden Ring');
  });
});

describe('PATCH /api/admin/alerts/[id]', () => {
  it('returns 401 when requireAdmin returns a response', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const req = new NextRequest('http://localhost/api/admin/alerts/a1', { method: 'PATCH' });
    const res = await PATCH(req, { params: { id: 'a1' } });
    expect(res.status).toBe(401);
  });

  it('dismisses the alert and returns updated record', async () => {
    const req = new NextRequest('http://localhost/api/admin/alerts/a1', { method: 'PATCH' });
    const res = await PATCH(req, { params: { id: 'a1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alert.dismissed).toBe(true);
    expect(mockDismissAlert).toHaveBeenCalledWith('a1');
  });
});
