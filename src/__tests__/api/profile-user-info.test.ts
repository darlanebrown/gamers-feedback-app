jest.mock('@/lib/reviewStore', () => ({
  getReviewsByTag:    jest.fn().mockResolvedValue([]),
  getGamesByReviewer: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/followStore', () => ({
  getFollowerCount:  jest.fn().mockResolvedValue(0),
  getFollowingCount: jest.fn().mockResolvedValue(0),
  isFollowing:       jest.fn().mockResolvedValue(false),
}));

jest.mock('@/lib/auth', () => ({
  getSession:     jest.fn().mockResolvedValue(null),
  SESSION_COOKIE: 'gf_session',
}));

jest.mock('@/lib/userStore', () => ({
  findUserByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/route';
import { findUserByTag } from '@/lib/userStore';

const mockFindUser = findUserByTag as jest.Mock;

const BASE_USER = {
  id: 'u1', gamerTag: 'Darla#1', email: 'd@example.com',
  displayName: 'Darla B.', bio: 'I play everything.', role: 'user', banned: false,
};

function req(tag = 'Darla%231') {
  return new NextRequest(`http://localhost/api/profile/${tag}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockFindUser.mockResolvedValue(BASE_USER);
  // restore default mocks after resetAllMocks
  const { getReviewsByTag, getGamesByReviewer } = jest.requireMock('@/lib/reviewStore');
  (getReviewsByTag as jest.Mock).mockResolvedValue([]);
  (getGamesByReviewer as jest.Mock).mockResolvedValue([]);
  const { getFollowerCount, getFollowingCount, isFollowing } = jest.requireMock('@/lib/followStore');
  (getFollowerCount as jest.Mock).mockResolvedValue(0);
  (getFollowingCount as jest.Mock).mockResolvedValue(0);
  (isFollowing as jest.Mock).mockResolvedValue(false);
  const { getSession } = jest.requireMock('@/lib/auth');
  (getSession as jest.Mock).mockResolvedValue(null);
});

describe('GET /api/profile/[tag] — user info', () => {
  it('includes displayName and bio in response', async () => {
    const res = await GET(req(), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(body.user.displayName).toBe('Darla B.');
    expect(body.user.bio).toBe('I play everything.');
  });

  it('user fields are null when not set', async () => {
    mockFindUser.mockResolvedValue({ ...BASE_USER, displayName: null, bio: null });
    const res = await GET(req(), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(body.user.displayName).toBeNull();
    expect(body.user.bio).toBeNull();
  });

  it('does not expose passwordHash in response', async () => {
    mockFindUser.mockResolvedValue({ ...BASE_USER, passwordHash: 'secret' });
    const res = await GET(req(), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('user is null when gamerTag not found', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await GET(req(), { params: { tag: 'Ghost#99' } });
    const body = await res.json();
    expect(body.user).toBeNull();
  });
});
