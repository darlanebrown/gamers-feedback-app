jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    reviewVote:     { count: jest.fn() },
    reviewComment:  { count: jest.fn() },
    reviewBookmark: { count: jest.fn() },
    reviewFlag:     { count: jest.fn() },
  },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/stats/route';
import { getReviewById } from '@/lib/reviewStore';
import { prisma } from '@/lib/prisma';

const mockGetReview      = getReviewById as jest.Mock;
const mockVoteCount      = (prisma.reviewVote     as any).count as jest.Mock;
const mockCommentCount   = (prisma.reviewComment  as any).count as jest.Mock;
const mockBookmarkCount  = (prisma.reviewBookmark as any).count as jest.Mock;
const mockFlagCount      = (prisma.reviewFlag     as any).count as jest.Mock;

const REVIEW = { id: 'r1', gameTitle: 'Elden Ring', reviewerTag: 'Player#99', classification: 'helpful' };

function makeReq() {
  return new NextRequest('http://localhost/api/reviews/r1/stats');
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetReview.mockResolvedValue(REVIEW);
  mockVoteCount.mockImplementation(({ where }: any) =>
    Promise.resolve(where?.type === 'up' ? 12 : 3),
  );
  mockCommentCount.mockResolvedValue(5);
  mockBookmarkCount.mockResolvedValue(7);
  mockFlagCount.mockResolvedValue(1);
});

describe('GET /api/reviews/[id]/stats', () => {
  it('returns 404 when review does not exist', async () => {
    mockGetReview.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(404);
  });

  it('returns 200 with all stats fields', async () => {
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      upvotes:       expect.any(Number),
      downvotes:     expect.any(Number),
      commentCount:  expect.any(Number),
      bookmarkCount: expect.any(Number),
      flagCount:     expect.any(Number),
    });
  });

  it('returns correct upvote and downvote counts', async () => {
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.upvotes).toBe(12);
    expect(body.downvotes).toBe(3);
  });

  it('returns correct comment, bookmark, and flag counts', async () => {
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.commentCount).toBe(5);
    expect(body.bookmarkCount).toBe(7);
    expect(body.flagCount).toBe(1);
  });

  it('is publicly accessible without authentication', async () => {
    const res = await GET(makeReq(), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
  });

  it('returns zero counts when review has no activity', async () => {
    mockVoteCount.mockResolvedValue(0);
    mockCommentCount.mockResolvedValue(0);
    mockBookmarkCount.mockResolvedValue(0);
    mockFlagCount.mockResolvedValue(0);

    const res = await GET(makeReq(), { params: { id: 'r1' } });
    const body = await res.json();
    expect(body.upvotes).toBe(0);
    expect(body.downvotes).toBe(0);
    expect(body.commentCount).toBe(0);
    expect(body.bookmarkCount).toBe(0);
    expect(body.flagCount).toBe(0);
  });
});
