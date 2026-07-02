jest.mock('@/lib/gameFollowStore', () => ({
  toggleGameFollow:    jest.fn(),
  isFollowingGame:     jest.fn(),
  getFollowedGames:    jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/userStore', () => ({ getUserByTag: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/games/[title]/follow/route';
import { GET  } from '@/app/api/games/followed/route';
import { toggleGameFollow, isFollowingGame, getFollowedGames } from '@/lib/gameFollowStore';
import { getSession } from '@/lib/auth';
import { getUserByTag } from '@/lib/userStore';

const mockToggle       = toggleGameFollow as jest.Mock;
const mockIsFollowing  = isFollowingGame  as jest.Mock;
const mockGetFollowed  = getFollowedGames as jest.Mock;
const mockGetSession   = getSession       as jest.Mock;
const mockGetUser      = getUserByTag     as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };
const USER    = { id: 'u1', gamerTag: 'Darla#1' };

function makePostReq(title: string) {
  return new NextRequest(
    `http://localhost/api/games/${encodeURIComponent(title)}/follow`,
    { method: 'POST' },
  );
}

function makeGetReq() {
  return new NextRequest('http://localhost/api/games/followed');
}

function makeParams(title: string) {
  return Promise.resolve({ title });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockToggle.mockResolvedValue(true);
  mockIsFollowing.mockResolvedValue(false);
  mockGetFollowed.mockResolvedValue(['Hades', 'Celeste']);
  mockGetSession.mockResolvedValue(SESSION);
  mockGetUser.mockResolvedValue(USER);
});

describe('POST /api/games/[title]/follow', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(makePostReq('Hades'), { params: makeParams('Hades') });
    expect(res.status).toBe(401);
  });

  it('toggles follow and returns following: true when newly followed', async () => {
    mockToggle.mockResolvedValue(true);
    const res = await POST(makePostReq('Hades'), { params: makeParams('Hades') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.following).toBe(true);
    expect(mockToggle).toHaveBeenCalledWith('u1', 'Hades');
  });

  it('returns following: false when unfollowed', async () => {
    mockToggle.mockResolvedValue(false);
    const res = await POST(makePostReq('Hades'), { params: makeParams('Hades') });
    const body = await res.json();
    expect(body.following).toBe(false);
  });

  it('decodes URL-encoded game title', async () => {
    await POST(makePostReq('Elden Ring'), { params: makeParams('Elden Ring') });
    expect(mockToggle).toHaveBeenCalledWith('u1', 'Elden Ring');
  });
});

describe('GET /api/games/followed', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it('returns list of followed game titles', async () => {
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toEqual(['Hades', 'Celeste']);
    expect(mockGetFollowed).toHaveBeenCalledWith('u1');
  });

  it('returns empty array when user follows no games', async () => {
    mockGetFollowed.mockResolvedValue([]);
    const res = await GET(makeGetReq());
    const body = await res.json();
    expect(body.games).toEqual([]);
  });
});
