jest.mock('@/lib/notificationStore', () => ({
  getNotifications:  jest.fn(),
  countNotifications: jest.fn(),
  getUnreadCount:    jest.fn(),
  markAllRead:       jest.fn(),
  markRead:          jest.fn(),
  markManyRead:      jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/notifications/route';
import { markManyRead, markAllRead, markRead } from '@/lib/notificationStore';
import { getSession } from '@/lib/auth';

const mockMarkManyRead = markManyRead as jest.Mock;
const mockMarkAllRead  = markAllRead  as jest.Mock;
const mockMarkRead     = markRead     as jest.Mock;
const mockGetSession   = getSession   as jest.Mock;

const SESSION = { gamerTag: 'Gamer#1', role: 'user' };

function makeReq(body?: object) {
  return new NextRequest('http://localhost/api/notifications', {
    method: 'PATCH',
    body:   body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockMarkManyRead.mockResolvedValue(undefined);
  mockMarkAllRead.mockResolvedValue(undefined);
  mockMarkRead.mockResolvedValue(undefined);
});

describe('PATCH /api/notifications — bulk ids', () => {
  it('calls markManyRead when ids array is provided', async () => {
    const res = await makeReq({ ids: ['n1', 'n2', 'n3'] });
    const response = await PATCH(res);
    expect(response.status).toBe(200);
    expect(mockMarkManyRead).toHaveBeenCalledWith(['n1', 'n2', 'n3']);
    expect(mockMarkAllRead).not.toHaveBeenCalled();
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('returns 400 when ids is not an array', async () => {
    const response = await PATCH(makeReq({ ids: 'n1' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when ids is an empty array', async () => {
    const response = await PATCH(makeReq({ ids: [] }));
    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await PATCH(makeReq({ ids: ['n1'] }));
    expect(response.status).toBe(401);
  });

  it('still marks all read when no body is provided', async () => {
    const response = await PATCH(makeReq());
    expect(response.status).toBe(200);
    expect(mockMarkAllRead).toHaveBeenCalledWith('Gamer#1');
    expect(mockMarkManyRead).not.toHaveBeenCalled();
  });

  it('still marks single id when only id is provided', async () => {
    const response = await PATCH(makeReq({ id: 'n1' }));
    expect(response.status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(mockMarkManyRead).not.toHaveBeenCalled();
  });
});
