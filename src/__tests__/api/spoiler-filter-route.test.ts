jest.mock('@/lib/reviewStore', () => ({
  getAllReviews: jest.fn(),
  countAllReviews: jest.fn(),
  getHelpfulReviews: jest.fn(),
  countHelpfulReviews: jest.fn(),
  getReviewsByGame: jest.fn(),
  addReview: jest.fn(),
  getRecentReviewCountByTag: jest.fn(),
}));

jest.mock('@/lib/alertService',    () => ({ checkForBombing: jest.fn() }));
jest.mock('@/lib/embeddingService', () => ({ embedAndStore: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/route';
import { getHelpfulReviews, countHelpfulReviews } from '@/lib/reviewStore';

const mockGetHelpful   = getHelpfulReviews  as jest.Mock;
const mockCountHelpful = countHelpfulReviews as jest.Mock;

function makeReview(overrides = {}) {
  return {
    id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
    headline: 'Great', body: 'Fun game.', reviewerTag: 'Darla#1',
    classification: 'helpful', hasSpoilers: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/reviews${query}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockCountHelpful.mockResolvedValue(10);
});

describe('GET /api/reviews — spoiler filter', () => {
  it('returns all reviews including spoilers when hideSpoilers is not set', async () => {
    mockGetHelpful.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
  });

  it('filters out spoiler reviews when ?hideSpoilers=true', async () => {
    mockGetHelpful.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq('?hideSpoilers=true'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].hasSpoilers).toBe(false);
  });

  it('does not filter when ?hideSpoilers=false', async () => {
    mockGetHelpful.mockResolvedValue([
      makeReview({ hasSpoilers: false }),
      makeReview({ id: 'r2', hasSpoilers: true }),
    ]);
    const res = await GET(makeReq('?hideSpoilers=false'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(2);
  });
});
