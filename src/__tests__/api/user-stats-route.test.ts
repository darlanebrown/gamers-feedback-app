jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore',       () => ({ getReviewsByTag: jest.fn() }));
jest.mock('@/lib/followStore',       () => ({ getFollowerCount: jest.fn(), getFollowingCount: jest.fn() }));
jest.mock('@/lib/notificationStore', () => ({ getUnreadCount: jest.fn() }));
jest.mock('@/lib/paymentStore',      () => ({ getPaymentsByRecipient: jest.fn(), getPaymentsBySender: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/me/stats/route';
import { getSession }                               from '@/lib/auth';
import { getReviewsByTag }                          from '@/lib/reviewStore';
import { getFollowerCount, getFollowingCount }      from '@/lib/followStore';
import { getUnreadCount }                           from '@/lib/notificationStore';
import { getPaymentsByRecipient, getPaymentsBySender } from '@/lib/paymentStore';

const mockSession    = getSession            as jest.Mock;
const mockReviews    = getReviewsByTag       as jest.Mock;
const mockFollowers  = getFollowerCount      as jest.Mock;
const mockFollowing  = getFollowingCount     as jest.Mock;
const mockUnread     = getUnreadCount        as jest.Mock;
const mockReceived   = getPaymentsByRecipient as jest.Mock;
const mockSent       = getPaymentsBySender   as jest.Mock;

const SESSION = { id: 'u1', gamerTag: 'Darla#1', role: 'user' };

const REVIEWS  = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
const RECEIVED = [{ amountCents: 500 }, { amountCents: 1000 }];
const SENT     = [{ amountCents: 300 }];

function makeReq() {
  return new NextRequest('http://localhost/api/users/me/stats');
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockReviews.mockResolvedValue(REVIEWS);
  mockFollowers.mockResolvedValue(12);
  mockFollowing.mockResolvedValue(5);
  mockUnread.mockResolvedValue(3);
  mockReceived.mockResolvedValue(RECEIVED);
  mockSent.mockResolvedValue(SENT);
});

describe('GET /api/users/me/stats', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns all stats in parallel for current user', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gamerTag).toBe('Darla#1');
    expect(body.reviewCount).toBe(3);
    expect(body.followerCount).toBe(12);
    expect(body.followingCount).toBe(5);
    expect(body.unreadNotifications).toBe(3);
  });

  it('returns tip stats — tipsReceived and tipsSent', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.tipsReceived.count).toBe(2);
    expect(body.tipsReceived.totalCents).toBe(1500);
    expect(body.tipsReceived.totalDollars).toBe('15.00');
    expect(body.tipsSent.count).toBe(1);
    expect(body.tipsSent.totalCents).toBe(300);
    expect(body.tipsSent.totalDollars).toBe('3.00');
  });

  it('fetches all data scoped to the session gamerTag', async () => {
    await GET(makeReq());
    expect(mockReviews).toHaveBeenCalledWith('Darla#1');
    expect(mockFollowers).toHaveBeenCalledWith('Darla#1');
    expect(mockFollowing).toHaveBeenCalledWith('Darla#1');
    expect(mockUnread).toHaveBeenCalledWith('Darla#1');
    expect(mockReceived).toHaveBeenCalledWith('Darla#1');
    expect(mockSent).toHaveBeenCalledWith('Darla#1');
  });

  it('returns zero stats when user has no activity', async () => {
    mockReviews.mockResolvedValue([]);
    mockFollowers.mockResolvedValue(0);
    mockFollowing.mockResolvedValue(0);
    mockUnread.mockResolvedValue(0);
    mockReceived.mockResolvedValue([]);
    mockSent.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reviewCount).toBe(0);
    expect(body.tipsReceived.count).toBe(0);
    expect(body.tipsReceived.totalCents).toBe(0);
  });
});
