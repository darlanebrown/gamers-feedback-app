jest.mock('@/lib/leaderboardStore', () => ({
  getTopReviewers: jest.fn(),
  getTopGames:     jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/route';
import { getTopReviewers, getTopGames } from '@/lib/leaderboardStore';

const mockReviewers = getTopReviewers as jest.Mock;
const mockGames     = getTopGames     as jest.Mock;

function req(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/leaderboard');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

beforeEach(() => {
  jest.resetAllMocks();
  mockReviewers.mockResolvedValue([]);
  mockGames.mockResolvedValue([]);
});

describe('GET /api/leaderboard with period', () => {
  it('passes no since date for period=all (default)', async () => {
    await GET(req());
    expect(mockReviewers).toHaveBeenCalledWith(10, undefined);
    expect(mockGames).toHaveBeenCalledWith(10, undefined);
  });

  it('passes a ~7-day since date for period=weekly', async () => {
    const before = Date.now();
    await GET(req({ period: 'weekly' }));
    const after = Date.now();
    const [, since] = mockReviewers.mock.calls[0] as [number, Date];
    expect(since).toBeInstanceOf(Date);
    const age = before - since.getTime();
    expect(age).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(age).toBeLessThanOrEqual(after - since.getTime() + 8 * 24 * 60 * 60 * 1000);
  });

  it('passes a ~30-day since date for period=monthly', async () => {
    const before = Date.now();
    await GET(req({ period: 'monthly' }));
    const [, since] = mockReviewers.mock.calls[0] as [number, Date];
    expect(since).toBeInstanceOf(Date);
    const age = before - since.getTime();
    expect(age).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
    expect(age).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
  });

  it('response includes period field', async () => {
    const res = await GET(req({ period: 'weekly' }));
    const body = await res.json();
    expect(body.period).toBe('weekly');
  });
});
