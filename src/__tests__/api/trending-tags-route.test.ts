jest.mock('@/lib/reviewTagStore', () => ({
  getTrendingTags: jest.fn(),
  VALID_TAGS: ['rpg', 'indie', 'multiplayer', 'singleplayer', 'action', 'strategy', 'horror', 'puzzle'],
  addTag: jest.fn(),
  removeTag: jest.fn(),
  getTagsForReview: jest.fn(),
  getReviewsByTag: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/tags/route';
import { getTrendingTags } from '@/lib/reviewTagStore';

const mockTrending = getTrendingTags as jest.Mock;

function makeReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/reviews/tags');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  (jest.requireMock('@/lib/reviewTagStore') as { getTrendingTags: jest.Mock })
    .getTrendingTags.mockResolvedValue([]);
});

describe('GET /api/reviews/tags', () => {
  it('returns tags sorted by count descending', async () => {
    mockTrending.mockResolvedValue([
      { tag: 'rpg', count: 42 },
      { tag: 'indie', count: 17 },
      { tag: 'action', count: 5 },
    ]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tags).toHaveLength(3);
    expect(body.tags[0]).toEqual({ tag: 'rpg', count: 42 });
    expect(body.tags[1]).toEqual({ tag: 'indie', count: 17 });
  });

  it('is publicly accessible — no auth required', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it('returns empty array when no tags have been used', async () => {
    mockTrending.mockResolvedValue([]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.tags).toEqual([]);
  });

  it('calls getTrendingTags once', async () => {
    await GET(makeReq());
    expect(mockTrending).toHaveBeenCalledTimes(1);
  });
});
