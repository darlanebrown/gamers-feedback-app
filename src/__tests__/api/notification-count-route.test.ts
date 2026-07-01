jest.mock('@/lib/notificationStore', () => ({
  getUnreadCount: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/count/route';
import { getUnreadCount } from '@/lib/notificationStore';
import { getSession } from '@/lib/auth';

const mockGetUnreadCount = getUnreadCount as jest.Mock;
const mockGetSession     = getSession     as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(null);
  mockGetUnreadCount.mockResolvedValue(0);
});

function req() {
  return new NextRequest('http://localhost/api/notifications/count');
}

describe('GET /api/notifications/count', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it('returns unreadCount for the authenticated user', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Darla#1' });
    mockGetUnreadCount.mockResolvedValue(5);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.unreadCount).toBe(5);
    expect(mockGetUnreadCount).toHaveBeenCalledWith('Darla#1');
  });

  it('returns unreadCount of 0 when no unread notifications', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Ghost#1' });
    mockGetUnreadCount.mockResolvedValue(0);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.unreadCount).toBe(0);
  });
});
