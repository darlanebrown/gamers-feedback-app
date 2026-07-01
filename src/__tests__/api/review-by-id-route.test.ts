jest.mock('@/lib/reviewStore', () => ({
  getReviewById: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/[id]/route';
import { getReviewById } from '@/lib/reviewStore';

const mockGetById = getReviewById as jest.Mock;

const REVIEW = {
  id: 'r1', gameTitle: 'Elden Ring', platform: 'PC', rating: 9,
  headline: 'A masterpiece of game design', body: 'FromSoftware outdid themselves.',
  pros: 'Combat, World design', cons: 'Steep learning curve', playtime: '120h',
  reviewerTag: 'Darla#1', classification: 'helpful',
  classificationReason: null, createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => jest.resetAllMocks());

describe('GET /api/reviews/[id]', () => {
  it('returns 200 with the review when found', async () => {
    mockGetById.mockResolvedValue(REVIEW);

    const req = new NextRequest('http://localhost/api/reviews/r1');
    const res = await GET(req, { params: { id: 'r1' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.review.id).toBe('r1');
    expect(body.review.headline).toBe('A masterpiece of game design');
  });

  it('returns 404 when review is not found', async () => {
    mockGetById.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/reviews/missing');
    const res = await GET(req, { params: { id: 'missing' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('calls getReviewById with the correct id', async () => {
    mockGetById.mockResolvedValue(REVIEW);

    const req = new NextRequest('http://localhost/api/reviews/r1');
    await GET(req, { params: { id: 'r1' } });

    expect(mockGetById).toHaveBeenCalledWith('r1');
  });
});
