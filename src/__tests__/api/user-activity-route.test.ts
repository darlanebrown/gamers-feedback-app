jest.mock('@/lib/userStore', () => ({ findUserByTag: jest.fn() }));
jest.mock('@/lib/activityService', () => ({ getUserActivity: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/profile/[tag]/activity/route';
import { findUserByTag } from '@/lib/userStore';
import { getUserActivity } from '@/lib/activityService';

const mockFindUser    = findUserByTag   as jest.Mock;
const mockGetActivity = getUserActivity as jest.Mock;

const USER = { id: 'u1', gamerTag: 'Darla#1', displayName: 'Darla', role: 'user', banned: false };

function makeReq(tag: string, query = '') {
  return new NextRequest(`http://localhost/api/profile/${encodeURIComponent(tag)}/activity${query}`);
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/profile/[tag]/activity', () => {
  it('returns 404 when user does not exist', async () => {
    mockFindUser.mockResolvedValue(null);
    const res = await GET(makeReq('Nobody#99'), { params: { tag: 'Nobody#99' } });
    expect(res.status).toBe(404);
  });

  it('returns activity for an existing user with default limit 20', async () => {
    mockFindUser.mockResolvedValue(USER);
    mockGetActivity.mockResolvedValue([
      { type: 'review',  id: 'r1', gameTitle: 'Hades',  createdAt: '2026-07-01T01:00:00.000Z' },
      { type: 'comment', id: 'c1', reviewId: 'r1',      createdAt: '2026-07-01T00:00:00.000Z' },
    ]);
    const res = await GET(makeReq('Darla#1'), { params: { tag: 'Darla#1' } });
    expect(res.status).toBe(200);
    expect(mockGetActivity).toHaveBeenCalledWith('Darla#1', 20);
    const body = await res.json();
    expect(body.activities).toHaveLength(2);
    expect(body.activities[0].type).toBe('review');
    expect(body.activities[1].type).toBe('comment');
  });

  it('respects ?limit param clamped to max 50', async () => {
    mockFindUser.mockResolvedValue(USER);
    mockGetActivity.mockResolvedValue([]);
    await GET(makeReq('Darla#1', '?limit=100'), { params: { tag: 'Darla#1' } });
    expect(mockGetActivity).toHaveBeenCalledWith('Darla#1', 50);
  });

  it('returns empty array when user has no activity', async () => {
    mockFindUser.mockResolvedValue(USER);
    mockGetActivity.mockResolvedValue([]);
    const res = await GET(makeReq('Darla#1'), { params: { tag: 'Darla#1' } });
    const body = await res.json();
    expect(body.activities).toEqual([]);
  });
});
