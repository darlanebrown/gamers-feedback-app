jest.mock('@/lib/notificationStore', () => ({
  getNotifications:   jest.fn(),
  getUnreadCount:     jest.fn(),
  countNotifications: jest.fn(),
  markAllRead:        jest.fn(),
  markRead:           jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/notifications/route';
import { getSession } from '@/lib/auth';
import { getNotifications, countNotifications } from '@/lib/notificationStore';

const mockGetSession        = getSession          as jest.Mock;
const mockGetNotifications  = getNotifications    as jest.Mock;
const mockCount             = countNotifications  as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1' };

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetNotifications.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
  const { getUnreadCount } = jest.requireMock('@/lib/notificationStore');
  (getUnreadCount as jest.Mock).mockResolvedValue(0);
});

function req(params = '') {
  return new NextRequest(`http://localhost/api/notifications${params}`);
}

describe('GET /api/notifications — pagination', () => {
  it('defaults to page 1, limit 20', async () => {
    await GET(req());
    expect(mockGetNotifications).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20 });
  });

  it('page 2 with limit 5 produces correct skip/take', async () => {
    await GET(req('?page=2&limit=5'));
    expect(mockGetNotifications).toHaveBeenCalledWith('Darla#1', { skip: 5, take: 5 });
  });

  it('response includes total from countNotifications', async () => {
    mockCount.mockResolvedValue(42);
    const res = await GET(req());
    const body = await res.json();
    expect(body.total).toBe(42);
    expect(mockCount).toHaveBeenCalledWith('Darla#1');
  });

  it('response includes page and limit', async () => {
    const res = await GET(req('?page=3&limit=5'));
    const body = await res.json();
    expect(body.page).toBe(3);
    expect(body.limit).toBe(5);
  });
});
