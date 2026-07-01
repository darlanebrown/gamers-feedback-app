jest.mock('@/lib/reviewStore', () => ({
  getReviewsByGame: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/[title]/reviews/route';
import { getReviewsByGame } from '@/lib/reviewStore';

const mockGetByGame = getReviewsByGame as jest.Mock;

const REVIEW = {
  id: 'r1', gameTitle: 'Hades', platform: 'PC', rating: 9,
  headline: 'Great run', body: 'Excellent roguelike.', pros: 'Combat',
  cons: 'None', playtime: '80h', reviewerTag: 'Darla#1',
  classification: 'helpful', classificationReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function req(title: string) {
  return new NextRequest(`http://localhost/api/games/${encodeURIComponent(title)}/reviews`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockGetByGame.mockResolvedValue([REVIEW]);
});

describe('GET /api/games/[title]/reviews', () => {
  it('returns 200 with reviews array', async () => {
    const res = await GET(req('Hades'), { params: { title: 'Hades' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].id).toBe('r1');
  });

  it('passes decoded title and default sort to getReviewsByGame', async () => {
    await GET(req('Elden%20Ring'), { params: { title: 'Elden Ring' } });
    expect(mockGetByGame).toHaveBeenCalledWith('Elden Ring', 'newest');
  });

  it('returns empty array when no reviews exist for the game', async () => {
    mockGetByGame.mockResolvedValue([]);
    const res = await GET(req('Unknown'), { params: { title: 'Unknown' } });
    const body = await res.json();
    expect(body.reviews).toEqual([]);
  });

  it('returns 500 when getReviewsByGame throws', async () => {
    mockGetByGame.mockRejectedValue(new Error('DB error'));
    const res = await GET(req('Hades'), { params: { title: 'Hades' } });
    expect(res.status).toBe(500);
  });
});
