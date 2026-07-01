jest.mock('@/lib/followStore', () => ({
  getFollowers:   jest.fn(),
  getFollowedTags: jest.fn(),
  isFollowing:    jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn().mockResolvedValue(null),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { GET as getFollowersRoute }  from '@/app/api/profile/[tag]/followers/route';
import { GET as getFollowingRoute }  from '@/app/api/profile/[tag]/following/route';
import { getFollowers, getFollowedTags, isFollowing } from '@/lib/followStore';
import { getSession } from '@/lib/auth';

const mockGetFollowers  = getFollowers    as jest.Mock;
const mockGetFollowing  = getFollowedTags as jest.Mock;
const mockIsFollowing   = isFollowing     as jest.Mock;
const mockGetSession    = getSession      as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetFollowers.mockResolvedValue([]);
  mockGetFollowing.mockResolvedValue([]);
  mockIsFollowing.mockResolvedValue(false);
  mockGetSession.mockResolvedValue(null);
});

function req(tag: string, path: string) {
  return new NextRequest(`http://localhost/api/profile/${encodeURIComponent(tag)}/${path}`);
}

describe('GET /api/profile/[tag]/followers', () => {
  it('returns list of follower tags', async () => {
    mockGetFollowers.mockResolvedValue(['Alice#1', 'Bob#2']);
    const res = await getFollowersRoute(req('Darla#1', 'followers'), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.followers).toEqual(['Alice#1', 'Bob#2']);
    expect(body.total).toBe(2);
  });

  it('includes viewerFollows for each follower when session present', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Darla#1' });
    mockGetFollowers.mockResolvedValue(['Alice#1']);
    mockIsFollowing.mockResolvedValue(true);
    const res = await getFollowersRoute(req('Darla#1', 'followers'), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(body.viewerTag).toBe('Darla#1');
  });

  it('returns empty list when nobody follows the user', async () => {
    const res = await getFollowersRoute(req('Ghost#1', 'followers'), { params: { tag: 'Ghost#1' } });
    const body = await res.json();
    expect(body.followers).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe('GET /api/profile/[tag]/following', () => {
  it('returns list of following tags', async () => {
    mockGetFollowing.mockResolvedValue(['Streamer#9', 'Pro#3']);
    const res = await getFollowingRoute(req('Darla#1', 'following'), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.following).toEqual(['Streamer#9', 'Pro#3']);
    expect(body.total).toBe(2);
  });

  it('returns empty list when user follows nobody', async () => {
    const res = await getFollowingRoute(req('Ghost#1', 'following'), { params: { tag: 'Ghost#1' } });
    const body = await res.json();
    expect(body.following).toEqual([]);
    expect(body.total).toBe(0);
  });
});
