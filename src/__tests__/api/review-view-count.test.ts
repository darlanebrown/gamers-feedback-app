jest.mock('@/lib/reviewStore', () => ({
  getReviewById:        jest.fn(),
  updateReview:         jest.fn(),
  deleteReview:         jest.fn(),
  incrementViewCount:   jest.fn(),
}));

jest.mock('@/lib/auth',           () => ({ getSession: jest.fn() }));
jest.mock('@/lib/revisionStore',  () => ({ createRevision: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/route';
import { getReviewById, incrementViewCount } from '@/lib/reviewStore';

const mockGetReviewById      = getReviewById      as jest.Mock;
const mockIncrementViewCount = incrementViewCount as jest.Mock;

const SAMPLE_REVIEW = {
  id: 'rev1', gameTitle: 'Hades', platform: 'PC', rating: 9,
  headline: 'Great', body: 'Really fun.', reviewerTag: 'Darla#1',
  classification: 'helpful', hasSpoilers: false, viewCount: 42,
  createdAt: '2026-07-01T00:00:00.000Z',
};

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/reviews/${id}`);
}

function makeParams(id: string) {
  return { id };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockIncrementViewCount.mockResolvedValue(undefined);
});

describe('GET /api/reviews/[id] — view count', () => {
  it('returns 404 when review does not exist', async () => {
    mockGetReviewById.mockResolvedValue(null);
    const res = await GET(makeReq('bad-id'), { params: makeParams('bad-id') });
    expect(res.status).toBe(404);
  });

  it('returns the review with viewCount', async () => {
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    const res = await GET(makeReq('rev1'), { params: makeParams('rev1') });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.review.viewCount).toBe(42);
  });

  it('calls incrementViewCount fire-and-forget on every GET', async () => {
    mockGetReviewById.mockResolvedValue(SAMPLE_REVIEW);
    await GET(makeReq('rev1'), { params: makeParams('rev1') });
    expect(mockIncrementViewCount).toHaveBeenCalledWith('rev1');
  });

  it('does not call incrementViewCount when review is not found', async () => {
    mockGetReviewById.mockResolvedValue(null);
    await GET(makeReq('bad-id'), { params: makeParams('bad-id') });
    expect(mockIncrementViewCount).not.toHaveBeenCalled();
  });
});
