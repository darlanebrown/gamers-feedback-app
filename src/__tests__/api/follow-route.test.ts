jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/followStore', () => ({
  followUser:   jest.fn(),
  unfollowUser: jest.fn(),
  isFollowing:  jest.fn(),
}));

jest.mock('@/lib/followNotificationService', () => ({
  notifyNewFollower: jest.fn(),
}));

jest.mock('@/lib/userStore', () => ({
  findUserByTag: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendFollowEmail: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/profile/[tag]/follow/route';
import { getSession } from '@/lib/auth';
import { followUser, unfollowUser, isFollowing } from '@/lib/followStore';
import { findUserByTag } from '@/lib/userStore';
import { notifyNewFollower } from '@/lib/followNotificationService';
import { sendFollowEmail } from '@/lib/emailService';

const mockSession      = getSession        as jest.Mock;
const mockFollow       = followUser        as jest.Mock;
const mockUnfollow     = unfollowUser      as jest.Mock;
const mockIsFollowing  = isFollowing       as jest.Mock;
const mockFindTag      = findUserByTag     as jest.Mock;
const mockNotifyFollow = notifyNewFollower as jest.Mock;
const mockFollowEmail  = sendFollowEmail   as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const TARGET  = { id: 'u2', email: 'player@test.com', gamerTag: 'Player#99' };

beforeEach(() => {
  jest.resetAllMocks();
  mockNotifyFollow.mockResolvedValue(undefined);
  (jest.requireMock('@/lib/emailService') as { sendFollowEmail: jest.Mock })
    .sendFollowEmail.mockResolvedValue(undefined);
});

function makeReq(method: string) {
  return new NextRequest('http://localhost/api/profile/Player%2399/follow', { method });
}

describe('POST /api/profile/[tag]/follow', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq('POST'), { params: { tag: 'Player#99' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when target user does not exist', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockFindTag.mockResolvedValue(null);
    const res = await POST(makeReq('POST'), { params: { tag: 'Player#99' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when trying to follow yourself', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await POST(makeReq('POST'), { params: { tag: 'Darla#1' } });
    expect(res.status).toBe(400);
  });

  it('follows successfully and returns following: true', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockFindTag.mockResolvedValue(TARGET);
    mockFollow.mockResolvedValue({});
    mockIsFollowing.mockResolvedValue(true);

    const res = await POST(makeReq('POST'), { params: { tag: 'Player#99' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockFollow).toHaveBeenCalledWith('Darla#1', 'Player#99');
    expect(body.following).toBe(true);
  });

  it('fires preference-gated follow notification to the followed user', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockFindTag.mockResolvedValue(TARGET);
    mockFollow.mockResolvedValue({});
    mockIsFollowing.mockResolvedValue(true);

    await POST(makeReq('POST'), { params: { tag: 'Player#99' } });

    expect(mockNotifyFollow).toHaveBeenCalledWith('Player#99', 'Darla#1');
  });

  it('sends a follow email to the target user', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockFindTag.mockResolvedValue(TARGET);
    mockFollow.mockResolvedValue({});
    mockIsFollowing.mockResolvedValue(true);

    await POST(makeReq('POST'), { params: { tag: 'Player#99' } });

    expect(mockFollowEmail).toHaveBeenCalledWith('player@test.com', 'Darla#1');
  });
});

describe('DELETE /api/profile/[tag]/follow', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq('DELETE'), { params: { tag: 'Player#99' } });
    expect(res.status).toBe(401);
  });

  it('unfollows successfully and returns following: false', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockUnfollow.mockResolvedValue({});
    mockIsFollowing.mockResolvedValue(false);

    const res = await DELETE(makeReq('DELETE'), { params: { tag: 'Player#99' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUnfollow).toHaveBeenCalledWith('Darla#1', 'Player#99');
    expect(body.following).toBe(false);
  });
});
