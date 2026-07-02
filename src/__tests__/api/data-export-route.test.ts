jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/userStore', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTag: jest.fn(),
}));

jest.mock('@/lib/commentStore', () => ({
  getComments: jest.fn(),
}));

jest.mock('@/lib/voteStore', () => ({
  getVoteCounts: jest.fn(),
}));

jest.mock('@/lib/bookmarkStore', () => ({
  getBookmarks: jest.fn(),
}));

jest.mock('@/lib/notificationStore', () => ({
  getNotifications: jest.fn(),
}));

jest.mock('@/lib/followStore', () => ({
  getFollowers:    jest.fn(),
  getFollowedTags: jest.fn(),
}));

jest.mock('@/lib/muteStore', () => ({
  getMutedTags: jest.fn(),
}));

jest.mock('@/lib/collectionStore', () => ({
  getCollections: jest.fn(),
}));

jest.mock('@/lib/badgeService', () => ({
  getUserBadges: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/me/export/route';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/userStore';
import { getReviewsByTag } from '@/lib/reviewStore';
import { getBookmarks } from '@/lib/bookmarkStore';
import { getNotifications } from '@/lib/notificationStore';
import { getFollowers, getFollowedTags } from '@/lib/followStore';
import { getMutedTags } from '@/lib/muteStore';
import { getCollections } from '@/lib/collectionStore';
import { getUserBadges } from '@/lib/badgeService';

const mockSession       = getSession       as jest.Mock;
const mockGetUser       = getUserById      as jest.Mock;
const mockGetReviews    = getReviewsByTag  as jest.Mock;
const mockGetBookmarks  = getBookmarks     as jest.Mock;
const mockGetNotifs     = getNotifications as jest.Mock;
const mockGetFollowers  = getFollowers    as jest.Mock;
const mockGetFollowing  = getFollowedTags as jest.Mock;
const mockGetMuted      = getMutedTags     as jest.Mock;
const mockGetColls      = getCollections   as jest.Mock;
const mockGetBadges     = getUserBadges    as jest.Mock;

const SESSION = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };
const USER    = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1', displayName: 'Darla', bio: 'Gamer', role: 'user', banned: false, createdAt: new Date() };

beforeEach(() => {
  jest.resetAllMocks();
  mockGetUser.mockResolvedValue(USER);
  mockGetReviews.mockResolvedValue([]);
  mockGetBookmarks.mockResolvedValue([]);
  mockGetNotifs.mockResolvedValue([]);
  mockGetFollowers.mockResolvedValue([]);
  mockGetFollowing.mockResolvedValue([]);
  mockGetMuted.mockResolvedValue([]);
  mockGetColls.mockResolvedValue([]);
  mockGetBadges.mockResolvedValue([]);
});

function makeReq() {
  return new NextRequest('http://localhost/api/auth/me/export');
}

describe('GET /api/auth/me/export', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 200 with a complete data bundle', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it('bundles profile without passwordHash', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.profile).toBeDefined();
    expect(body.profile.email).toBe('darla@test.com');
    expect(body.profile.passwordHash).toBeUndefined();
  });

  it('bundles reviews, bookmarks, notifications, collections, badges, muted, followers, following', async () => {
    mockSession.mockResolvedValue(SESSION);
    mockGetReviews.mockResolvedValue([{ id: 'r1', gameTitle: 'Elden Ring' }]);
    mockGetBookmarks.mockResolvedValue([{ reviewId: 'r1' }]);
    mockGetBadges.mockResolvedValue([{ id: 'first_review' }]);
    mockGetMuted.mockResolvedValue(['Troll#99']);
    mockGetColls.mockResolvedValue([{ id: 'col1', name: 'RPGs' }]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.reviews).toHaveLength(1);
    expect(body.bookmarks).toHaveLength(1);
    expect(body.badges).toHaveLength(1);
    expect(body.muted).toEqual(['Troll#99']);
    expect(body.collections).toHaveLength(1);
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(Array.isArray(body.followers)).toBe(true);
    expect(Array.isArray(body.following)).toBe(true);
  });

  it('sets Content-Disposition header for download', async () => {
    mockSession.mockResolvedValue(SESSION);
    const res = await GET(makeReq());
    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toMatch(/attachment/);
    expect(disposition).toMatch(/\.json/);
  });

  it('fetches all data in parallel (Promise.all)', async () => {
    mockSession.mockResolvedValue(SESSION);
    await GET(makeReq());
    // all data fetchers must have been called
    expect(mockGetReviews).toHaveBeenCalledWith('Darla#1');
    expect(mockGetBookmarks).toHaveBeenCalledWith('Darla#1');
    expect(mockGetNotifs).toHaveBeenCalledWith('Darla#1');
    expect(mockGetFollowers).toHaveBeenCalledWith('Darla#1');
    expect(mockGetFollowing).toHaveBeenCalledWith('Darla#1'); // getFollowedTags
    expect(mockGetMuted).toHaveBeenCalledWith('Darla#1');
    expect(mockGetColls).toHaveBeenCalledWith('Darla#1');
    expect(mockGetBadges).toHaveBeenCalledWith('Darla#1');
  });
});
