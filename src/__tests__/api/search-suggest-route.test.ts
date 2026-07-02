jest.mock('@/lib/gameService', () => ({
  getOrFetchGame: jest.fn(),
  suggestGames: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/suggest/route';
import { suggestGames } from '@/lib/gameService';

const mockSuggest = suggestGames as jest.Mock;

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/search/suggest${query}`);
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/search/suggest', () => {
  it('returns 400 when q param is missing', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it('returns 400 when q is empty', async () => {
    const res = await GET(makeReq('?q='));
    expect(res.status).toBe(400);
  });

  it('returns suggestions with default limit of 5', async () => {
    mockSuggest.mockResolvedValue(['Hades', 'Hollow Knight', 'Halo Infinite']);
    const res = await GET(makeReq('?q=ha'));
    expect(res.status).toBe(200);
    expect(mockSuggest).toHaveBeenCalledWith('ha', 5);
    const body = await res.json();
    expect(body.suggestions).toEqual(['Hades', 'Hollow Knight', 'Halo Infinite']);
  });

  it('respects a custom ?limit param clamped to max 10', async () => {
    mockSuggest.mockResolvedValue([]);
    await GET(makeReq('?q=el&limit=20'));
    expect(mockSuggest).toHaveBeenCalledWith('el', 10);
  });

  it('returns an empty array when no matches', async () => {
    mockSuggest.mockResolvedValue([]);
    const res = await GET(makeReq('?q=zzz'));
    const body = await res.json();
    expect(body.suggestions).toEqual([]);
  });
});
