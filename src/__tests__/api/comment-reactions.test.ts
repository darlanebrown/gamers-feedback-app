jest.mock('@/lib/commentReactionStore', () => ({
  getCommentReactions:   jest.fn(),
  toggleCommentReaction: jest.fn(),
  VALID_EMOJIS:          ['🔥', '😂', '🎮', '💯', '👎'],
}));

jest.mock('@/lib/auth',         () => ({ getSession: jest.fn() }));
jest.mock('@/lib/commentStore', () => ({ getCommentById: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/reviews/[id]/comments/[commentId]/reactions/route';
import { getCommentReactions, toggleCommentReaction, VALID_EMOJIS } from '@/lib/commentReactionStore';
import { getSession } from '@/lib/auth';
import { getCommentById } from '@/lib/commentStore';

const mockGetReactions    = getCommentReactions   as jest.Mock;
const mockToggleReaction  = toggleCommentReaction as jest.Mock;
const mockGetSession      = getSession            as jest.Mock;
const mockGetCommentById  = getCommentById        as jest.Mock;

const REVIEW_ID  = 'rev1';
const COMMENT_ID = 'c1';
const SESSION    = { gamerTag: 'Gamer#1', role: 'user' };
const SAMPLE_COMMENT = { id: COMMENT_ID, reviewId: REVIEW_ID, authorTag: 'Author#1', body: 'Nice.' };

function makeReq(url: string, opts: RequestInit = {}) {
  return new NextRequest(url, opts);
}

function makeParams(id: string, commentId: string) {
  return Promise.resolve({ id, commentId });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockToggleReaction.mockResolvedValue(undefined);
});

describe('GET /api/reviews/[id]/comments/[commentId]/reactions', () => {
  it('returns 404 when comment does not exist', async () => {
    mockGetCommentById.mockResolvedValue(null);
    const res = await GET(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(404);
  });

  it('returns reaction counts for a comment', async () => {
    mockGetCommentById.mockResolvedValue(SAMPLE_COMMENT);
    mockGetReactions.mockResolvedValue({ '🔥': 2, '💯': 1 });
    const res = await GET(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reactions['🔥']).toBe(2);
    expect(body.reactions['💯']).toBe(1);
  });
});

describe('POST /api/reviews/[id]/comments/[commentId]/reactions', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when comment does not exist', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetCommentById.mockResolvedValue(null);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid emoji', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetCommentById.mockResolvedValue(SAMPLE_COMMENT);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🍕' }),
      }),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when reacting to own comment', async () => {
    mockGetSession.mockResolvedValue({ gamerTag: 'Author#1', role: 'user' });
    mockGetCommentById.mockResolvedValue(SAMPLE_COMMENT);
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/own/i);
  });

  it('toggles reaction and returns updated counts', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGetCommentById.mockResolvedValue(SAMPLE_COMMENT);
    mockGetReactions.mockResolvedValue({ '🔥': 3 });
    const res = await POST(
      makeReq(`http://localhost/api/reviews/${REVIEW_ID}/comments/${COMMENT_ID}/reactions`, {
        method: 'POST', body: JSON.stringify({ emoji: '🔥' }),
      }),
      { params: makeParams(REVIEW_ID, COMMENT_ID) },
    );
    expect(res.status).toBe(200);
    expect(mockToggleReaction).toHaveBeenCalledWith(COMMENT_ID, 'Gamer#1', '🔥');
    const body = await res.json();
    expect(body.reactions['🔥']).toBe(3);
  });
});
