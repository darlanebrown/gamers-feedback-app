jest.mock('@/lib/paymentStore', () => ({ getLeaderboard: jest.fn() }));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/payments/leaderboard/route';
import { getLeaderboard } from '@/lib/paymentStore';

const mockLeaderboard = getLeaderboard as jest.Mock;

const LEADERBOARD = {
  topEarners: [
    { gamerTag: 'Creator#5', tipCount: 42, totalCents: 12300 },
    { gamerTag: 'Streamer#2', tipCount: 18, totalCents: 5000 },
    { gamerTag: 'Artist#9',  tipCount:  7, totalCents: 2100 },
  ],
  topTippers: [
    { gamerTag: 'Fan#1',    tipCount: 30, totalCents: 8500 },
    { gamerTag: 'Darla#1',  tipCount: 15, totalCents: 4200 },
    { gamerTag: 'Gamer#3',  tipCount:  5, totalCents: 1500 },
  ],
};

function makeReq(qs = '') {
  return new NextRequest(`http://localhost/api/payments/leaderboard${qs}`);
}

beforeEach(() => {
  jest.resetAllMocks();
  mockLeaderboard.mockResolvedValue(LEADERBOARD);
});

describe('GET /api/payments/leaderboard', () => {
  it('returns leaderboard with topEarners and topTippers', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.topEarners).toHaveLength(3);
    expect(body.topTippers).toHaveLength(3);
  });

  it('is public — no auth required', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it('topEarners includes gamerTag, tipCount, totalCents, totalDollars', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.topEarners[0]).toMatchObject({
      gamerTag:    'Creator#5',
      tipCount:    42,
      totalCents:  12300,
      totalDollars: '123.00',
    });
  });

  it('topTippers includes gamerTag, tipCount, totalCents, totalDollars', async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.topTippers[0]).toMatchObject({
      gamerTag:    'Fan#1',
      tipCount:    30,
      totalCents:  8500,
      totalDollars: '85.00',
    });
  });

  it('supports ?limit= param passed to store', async () => {
    await GET(makeReq('?limit=5'));
    expect(mockLeaderboard).toHaveBeenCalledWith({ limit: 5 });
  });

  it('defaults to limit 10', async () => {
    await GET(makeReq());
    expect(mockLeaderboard).toHaveBeenCalledWith({ limit: 10 });
  });

  it('clamps limit to max 25', async () => {
    await GET(makeReq('?limit=100'));
    expect(mockLeaderboard).toHaveBeenCalledWith({ limit: 25 });
  });

  it('returns empty arrays when no payments exist', async () => {
    mockLeaderboard.mockResolvedValue({ topEarners: [], topTippers: [] });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.topEarners).toEqual([]);
    expect(body.topTippers).toEqual([]);
  });
});
