jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn() as jest.MockedFunction<any>;
global.fetch = mockFetch;

import { getOrFetchGame } from '@/lib/gameService';
import { prisma } from '@/lib/prisma';

const mockFindFirst = prisma.game.findFirst as jest.Mock;
const mockUpsert    = prisma.game.upsert    as jest.Mock;

const FRESH_GAME = {
  slug:        'elden-ring',
  title:       'Elden Ring',
  coverUrl:    'https://example.com/cover.jpg',
  genres:      'Action, RPG',
  releaseDate: '2022-02-25',
  developer:   'FromSoftware',
  metacritic:  96,
  description: 'An action RPG set in the Lands Between.',
  fetchedAt:   new Date(),
};

const RAWG_SEARCH_RESULT = {
  results: [{
    id:               1234,
    slug:             'elden-ring',
    name:             'Elden Ring',
    background_image: 'https://example.com/cover.jpg',
    genres:           [{ name: 'Action' }, { name: 'RPG' }],
    released:         '2022-02-25',
    metacritic:       96,
  }],
};

const RAWG_DETAIL_RESULT = {
  ...RAWG_SEARCH_RESULT.results[0],
  developers:      [{ name: 'FromSoftware' }],
  description_raw: 'An action RPG set in the Lands Between.',
};

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.RAWG_API_KEY;
});

describe('getOrFetchGame', () => {
  it('returns cached game when cache is fresh', async () => {
    mockFindFirst.mockResolvedValue(FRESH_GAME);

    const result = await getOrFetchGame('Elden Ring');

    expect(result).toEqual(FRESH_GAME);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches from RAWG and caches when game is not in DB', async () => {
    process.env.RAWG_API_KEY = 'test-key';
    mockFindFirst.mockResolvedValue(null);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => RAWG_SEARCH_RESULT })
      .mockResolvedValueOnce({ ok: true, json: async () => RAWG_DETAIL_RESULT });
    mockUpsert.mockResolvedValue(FRESH_GAME);

    const result = await getOrFetchGame('Elden Ring');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(result).toEqual(FRESH_GAME);
  });

  it('re-fetches from RAWG when cached entry is stale (> 7 days)', async () => {
    process.env.RAWG_API_KEY = 'test-key';
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    mockFindFirst.mockResolvedValue({ ...FRESH_GAME, fetchedAt: staleDate });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => RAWG_SEARCH_RESULT })
      .mockResolvedValueOnce({ ok: true, json: async () => RAWG_DETAIL_RESULT });
    mockUpsert.mockResolvedValue(FRESH_GAME);

    await getOrFetchGame('Elden Ring');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('returns null when RAWG_API_KEY is missing and no cache exists', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getOrFetchGame('Unknown Game');

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when RAWG returns no results', async () => {
    process.env.RAWG_API_KEY = 'test-key';
    mockFindFirst.mockResolvedValue(null);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });

    const result = await getOrFetchGame('NotARealGame12345');

    expect(result).toBeNull();
  });

  it('returns stale cache when RAWG fetch fails', async () => {
    process.env.RAWG_API_KEY = 'test-key';
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const stale = { ...FRESH_GAME, fetchedAt: staleDate };
    mockFindFirst.mockResolvedValue(stale);
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await getOrFetchGame('Elden Ring');

    expect(result).toEqual(stale);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
