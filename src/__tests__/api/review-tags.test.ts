jest.mock('@/lib/reviewTagStore', () => ({
  addTag:          jest.fn(),
  removeTag:       jest.fn(),
  getTagsForReview: jest.fn(),
  getReviewsByTag: jest.fn(),
  VALID_TAGS:      ['rpg', 'indie', 'multiplayer', 'singleplayer', 'action', 'strategy', 'horror', 'puzzle'],
}));

jest.mock('@/lib/auth',        () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore', () => ({ getReviewById: jest.fn() }));

import { NextRequest } from 'next/server';
import { POST, GET as getTagsForReview } from '@/app/api/reviews/[id]/tags/route';
import { DELETE } from '@/app/api/reviews/[id]/tags/[tag]/route';
import { GET as getByTag } from '@/app/api/reviews/tags/[tag]/route';
import { addTag, removeTag, getTagsForReview as storeTags, getReviewsByTag, VALID_TAGS } from '@/lib/reviewTagStore';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';

const mockAdd        = addTag           as jest.Mock;
const mockRemove     = removeTag        as jest.Mock;
const mockStoreTags  = storeTags        as jest.Mock;
const mockByTag      = getReviewsByTag  as jest.Mock;
const mockSession    = getSession       as jest.Mock;
const mockGetReview  = getReviewById    as jest.Mock;

const SESSION = { gamerTag: 'Darla#1', role: 'user' };
const REVIEW  = { id: 'r1', reviewerTag: 'Darla#1', gameTitle: 'Hades' };

function makePostReq(id: string, body: object) {
  return new NextRequest(`http://localhost/api/reviews/${id}/tags`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}
function makeGetTagsReq(id: string) {
  return new NextRequest(`http://localhost/api/reviews/${id}/tags`);
}
function makeDeleteReq(id: string, tag: string) {
  return new NextRequest(`http://localhost/api/reviews/${id}/tags/${tag}`, { method: 'DELETE' });
}
function makeByTagReq(tag: string) {
  return new NextRequest(`http://localhost/api/reviews/tags/${tag}`);
}
const idParams  = (id: string)  => Promise.resolve({ id });
const tagParams = (tag: string) => Promise.resolve({ tag });
const bothParams = (id: string, tag: string) => Promise.resolve({ id, tag });

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.mockResolvedValue(SESSION);
  mockGetReview.mockResolvedValue(REVIEW);
  mockAdd.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
  mockStoreTags.mockResolvedValue(['rpg', 'indie']);
  mockByTag.mockResolvedValue([]);
  (jest.requireMock('@/lib/reviewTagStore') as any).VALID_TAGS =
    ['rpg', 'indie', 'multiplayer', 'singleplayer', 'action', 'strategy', 'horror', 'puzzle'];
});

describe('POST /api/reviews/[id]/tags', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostReq('r1', { tag: 'rpg' }), { params: idParams('r1') });
    expect(res.status).toBe(401);
  });

  it('returns 404 when review not found', async () => {
    mockGetReview.mockResolvedValue(null);
    const res = await POST(makePostReq('r1', { tag: 'rpg' }), { params: idParams('r1') });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the review', async () => {
    mockGetReview.mockResolvedValue({ ...REVIEW, reviewerTag: 'Other#2' });
    const res = await POST(makePostReq('r1', { tag: 'rpg' }), { params: idParams('r1') });
    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid tag', async () => {
    const res = await POST(makePostReq('r1', { tag: 'notvalid' }), { params: idParams('r1') });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid tag/i);
  });

  it('adds a valid tag and returns updated tags list', async () => {
    const res = await POST(makePostReq('r1', { tag: 'rpg' }), { params: idParams('r1') });
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith('r1', 'rpg');
    const body = await res.json();
    expect(body.tags).toEqual(['rpg', 'indie']);
  });
});

describe('DELETE /api/reviews/[id]/tags/[tag]', () => {
  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq('r1', 'rpg'), { params: bothParams('r1', 'rpg') });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user does not own the review', async () => {
    mockGetReview.mockResolvedValue({ ...REVIEW, reviewerTag: 'Other#2' });
    const res = await DELETE(makeDeleteReq('r1', 'rpg'), { params: bothParams('r1', 'rpg') });
    expect(res.status).toBe(403);
  });

  it('removes tag and returns updated tags list', async () => {
    mockStoreTags.mockResolvedValue(['indie']);
    const res = await DELETE(makeDeleteReq('r1', 'rpg'), { params: bothParams('r1', 'rpg') });
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith('r1', 'rpg');
    const body = await res.json();
    expect(body.tags).toEqual(['indie']);
  });
});

describe('GET /api/reviews/[id]/tags', () => {
  it('returns tags for a review (public)', async () => {
    const res = await getTagsForReview(makeGetTagsReq('r1'), { params: idParams('r1') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tags).toEqual(['rpg', 'indie']);
  });

  it('returns 404 when review not found', async () => {
    mockGetReview.mockResolvedValue(null);
    const res = await getTagsForReview(makeGetTagsReq('r1'), { params: idParams('r1') });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/reviews/tags/[tag]', () => {
  it('returns helpful reviews with the given tag', async () => {
    mockByTag.mockResolvedValue([REVIEW]);
    const res = await getByTag(makeByTagReq('rpg'), { params: tagParams('rpg') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(mockByTag).toHaveBeenCalledWith('rpg');
  });

  it('returns 400 for invalid tag', async () => {
    const res = await getByTag(makeByTagReq('notvalid'), { params: tagParams('notvalid') });
    expect(res.status).toBe(400);
  });
});
