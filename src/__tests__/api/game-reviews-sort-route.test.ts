jest.mock('@/lib/reviewStore', () => ({
  getReviewsByGame: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/[title]/reviews/route';
import { getReviewsByGame } from '@/lib/reviewStore';

const mockGetByGame = getReviewsByGame as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetByGame.mockResolvedValue([]);
});

function req(title: string, params = '') {
  return new NextRequest(`http://localhost/api/games/${encodeURIComponent(title)}/reviews${params}`);
}

describe('GET /api/games/[title]/reviews — sort param', () => {
  it('defaults to sort=newest when no param given', async () => {
    await GET(req('Hades'), { params: { title: 'Hades' } });
    expect(mockGetByGame).toHaveBeenCalledWith('Hades', 'newest');
  });

  it('passes sort=highest to the store', async () => {
    await GET(req('Hades', '?sort=highest'), { params: { title: 'Hades' } });
    expect(mockGetByGame).toHaveBeenCalledWith('Hades', 'highest');
  });

  it('passes sort=lowest to the store', async () => {
    await GET(req('Hades', '?sort=lowest'), { params: { title: 'Hades' } });
    expect(mockGetByGame).toHaveBeenCalledWith('Hades', 'lowest');
  });

  it('falls back to newest for an unrecognised sort value', async () => {
    await GET(req('Hades', '?sort=random'), { params: { title: 'Hades' } });
    expect(mockGetByGame).toHaveBeenCalledWith('Hades', 'newest');
  });
});
