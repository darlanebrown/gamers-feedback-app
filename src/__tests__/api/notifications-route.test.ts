jest.mock('@/lib/notificationStore', () => ({
  getNotifications:   jest.fn(),
  getUnreadCount:     jest.fn(),
  countNotifications: jest.fn().mockResolvedValue(0),
  markAllRead:        jest.fn(),
  markRead:           jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/notifications/route';
import { getNotifications, getUnreadCount, markAllRead, markRead } from '@/lib/notificationStore';
import { getSession } from '@/lib/auth';

const mockGetSession      = getSession       as jest.Mock;
const mockGetNotifications = getNotifications as jest.Mock;
const mockGetUnreadCount  = getUnreadCount   as jest.Mock;
const mockMarkAllRead     = markAllRead      as jest.Mock;
const mockMarkRead        = markRead         as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', email: 'darla@test.com', role: 'user' };
const NOTIFS = [
  { id: 'n1', userTag: 'Darla#1', type: 'follow', actorTag: 'Gamer#2', reviewId: null, gameTitle: null, read: false, createdAt: new Date().toISOString() },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockGetNotifications.mockResolvedValue(NOTIFS);
  mockGetUnreadCount.mockResolvedValue(1);
  mockMarkAllRead.mockResolvedValue(undefined);
  mockMarkRead.mockResolvedValue(undefined);
});

describe('GET /api/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    expect(res.status).toBe(401);
  });

  it('returns notifications and unread count for authenticated user', async () => {
    const res = await GET(new NextRequest('http://localhost/api/notifications'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
    expect(mockGetNotifications).toHaveBeenCalledWith('Darla#1', { skip: 0, take: 20 });
    expect(mockGetUnreadCount).toHaveBeenCalledWith('Darla#1');
  });
});

describe('PATCH /api/notifications/read', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/notifications/read', { method: 'PATCH' });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('marks all read when no id provided', async () => {
    const req = new NextRequest('http://localhost/api/notifications/read', { method: 'PATCH' });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockMarkAllRead).toHaveBeenCalledWith('Darla#1');
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('marks single notification read when id provided', async () => {
    const req = new NextRequest('http://localhost/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'n1' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockMarkAllRead).not.toHaveBeenCalled();
  });
});
