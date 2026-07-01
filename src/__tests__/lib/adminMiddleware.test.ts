jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getSession } from '@/lib/auth';

const mockGetSession = getSession as jest.Mock;

beforeEach(() => jest.resetAllMocks());

describe('requireAdmin', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/admin/reviews');
    const res = await requireAdmin(req);
    expect(res?.status).toBe(401);
  });

  it('returns 403 when the session user has role "user"', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1', role: 'user',
    });
    const req = new NextRequest('http://localhost/api/admin/reviews');
    const res = await requireAdmin(req);
    expect(res?.status).toBe(403);
  });

  it('returns null (passes) when session user has role "admin"', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u1', email: 'admin@test.com', gamerTag: 'Admin#1', role: 'admin',
    });
    const req = new NextRequest('http://localhost/api/admin/reviews');
    const res = await requireAdmin(req);
    expect(res).toBeNull();
  });

  it('returns 403 when session has no role field', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1',
    });
    const req = new NextRequest('http://localhost/api/admin/reviews');
    const res = await requireAdmin(req);
    expect(res?.status).toBe(403);
  });
});
