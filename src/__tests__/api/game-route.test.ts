jest.mock('@/lib/gameService', () => ({
  getOrFetchGame: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/[title]/route';
import { getOrFetchGame } from '@/lib/gameService';

const mockGetOrFetch = getOrFetchGame as jest.Mock;

const GAME_META = {
  slug:        'elden-ring',
  title:       'Elden Ring',
  coverUrl:    'https://example.com/cover.jpg',
  genres:      'Action, RPG',
  releaseDate: '2022-02-25',
  developer:   'FromSoftware',
  metacritic:  96,
  description: 'An action RPG.',
  fetchedAt:   new Date().toISOString(),
};

beforeEach(() => jest.resetAllMocks());

describe('GET /api/games/[title]', () => {
  it('returns 200 with game metadata when found', async () => {
    mockGetOrFetch.mockResolvedValue(GAME_META);

    const req = new NextRequest('http://localhost/api/games/Elden%20Ring');
    const res = await GET(req, { params: { title: 'Elden Ring' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.game.title).toBe('Elden Ring');
    expect(body.game.metacritic).toBe(96);
    expect(body.game.developer).toBe('FromSoftware');
  });

  it('returns 404 when game is not found', async () => {
    mockGetOrFetch.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/games/NotARealGame');
    const res = await GET(req, { params: { title: 'NotARealGame' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  it('calls getOrFetchGame with the decoded title', async () => {
    mockGetOrFetch.mockResolvedValue(GAME_META);

    const req = new NextRequest('http://localhost/api/games/Elden%20Ring');
    await GET(req, { params: { title: 'Elden Ring' } });

    expect(mockGetOrFetch).toHaveBeenCalledWith('Elden Ring');
  });
});
