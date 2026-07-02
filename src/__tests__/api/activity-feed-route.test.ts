jest.mock('@/lib/activityFeedService', () => ({
  getActivityFeed: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ getSession: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/feed/activity/route';
import { getActivityFeed } from '@/lib/activityFeedService';
import { getSession } from '@/lib/auth';

const mockFeed       = getActivityFeed as jest.Mock;
const mockGetSession = getSession       as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };

function makeActivity(overrides = {}) {
  return {
    type: 'review',
    actorTag: 'Bob#2',
    reviewId: 'r1',
    gameTitle: 'Hades',
    commentId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/feed/activity');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetSession.mockResolvedValue(SESSION);
  mockFeed.mockResolvedValue([]);
  (jest.requireMock('@/lib/activityFeedService') as { getActivityFeed: jest.Mock })
    .getActivityFeed.mockResolvedValue([]);
});

describe('GET /api/feed/activity', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns activity items for the authenticated user', async () => {
    mockFeed.mockResolvedValue([makeActivity()]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activity).toHaveLength(1);
    expect(body.activity[0].type).toBe('review');
  });

  it('passes gamerTag, limit, and skip to getActivityFeed', async () => {
    await GET(makeReq({ page: '2', limit: '10' }));
    expect(mockFeed).toHaveBeenCalledWith({ gamerTag: 'Darla#1', skip: 10, take: 10 });
  });

  it('defaults page=1, limit=20', async () => {
    await GET(makeReq());
    expect(mockFeed).toHaveBeenCalledWith({ gamerTag: 'Darla#1', skip: 0, take: 20 });
  });

  it('clamps limit to max 50', async () => {
    await GET(makeReq({ limit: '999' }));
    const call = mockFeed.mock.calls[0][0];
    expect(call.take).toBe(50);
  });

  it('returns empty array when no followed users have activity', async () => {
    mockFeed.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.activity).toEqual([]);
  });
});
