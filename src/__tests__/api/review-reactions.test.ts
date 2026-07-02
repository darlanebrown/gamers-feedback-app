jest.mock('@/lib/reactionStore', () => ({
  getReactions:    jest.fn(),
  toggleReaction:  jest.fn(),
  VALID_EMOJIS:    ['🔥', '😂', '🎮', '💯', '👎'],
}));

jest.mock('@/lib/auth',           () => ({ getSession: jest.fn() }));
jest.mock('@/lib/reviewStore',    () => ({ getReviewById: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/reviews/[id]/reactions/route';
import { getReactions, toggleReaction, VALID_EMOJIS } from '@/lib/reactionStore';
import { getSession } from '@/lib/auth';
import { getReviewById } from '@/lib/reviewStore';

const mockGetReactions   = getReactions   as jest.Mock;
const mockToggleReaction = toggleReaction as jest.Mock;
const mockGetSession     = getSession     as jest.Mock;
const mockGetReviewById  = getReviewById  as jest.Mock;

const REVIEW_ID = 'rev1';
const SESSION   = { gamerTag: 'Gamer#1', role: 'user' };
const SAMPLE_REVIEW = { id: REVIEW_ID, reviewerTag: 'Other#1' };

function makeReq(url: string, opts: RequestInit = {}) {
  return new NextRequest(url, opts);
}

function makeParams(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockToggleReaction.mockResolvedValue(undefined);
});

describe('GET /api/reviews/[id]/reactions', () => {
  it('returns 404 when review does not exist', async () => {
    mockGetReviewById.mockResolvedValue(null);
    const res = await GET(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(404);
  });

  it('returns reaction counts for a review', async () => {
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    mockGetReactions.mockResolvedValue({ '🔥': 3, '💯': 1 });
    const res = await GET(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactions['🔥']).toBe(3);
    expect(body.reactions['💯']).toBe(1);
  });
});

describe('POST /api/reviews/[id]/reactions', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when review does not exist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReviewById.mockResolvedValue(null);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid emoji', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🍕' }),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when emoji is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({}),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(400);
  });

  it('toggles the reaction and returns updated counts', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    mockGetReactions.mockResolvedValue({ '🔥': 2 });
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mockToggleReaction).toHaveBeenCalledWith(REVIEW_ID, 'Gamer#1', '🔥');
    expect(body.reactions['🔥']).toBe(2);
  });

  it('returns 400 when user reacts to their own review', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Other#1', role: 'user' });
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own/i);
  });
});
