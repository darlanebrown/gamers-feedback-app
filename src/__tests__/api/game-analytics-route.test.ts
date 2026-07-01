jest.mock('@/lib/gameAnalytics', () => ({
  getGameAnalytics: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/games/[title]/analytics/route';
import { getGameAnalytics } from '@/lib/gameAnalytics';

const mockGetGameAnalytics = getGameAnalytics as jest.Mock;

const ANALYTICS = {
  gameTitle: 'Elden Ring',
  totalReviews: 5,
  helpfulCount: 4,
  spamCount: 1,
  toxicCount: 0,
  avgRating: 8.8,
  platformBreakdown: [{ platform: 'PC', count: 3 }, { platform: 'PlayStation 5', count: 1 }],
  topPros: ['great combat', 'open world'],
  topCons: ['difficulty curve'],
};

beforeEach(() => {
  jest.resetAllMocks();
  mockGetGameAnalytics.mockResolvedValue(ANALYTICS);
});

describe('GET /api/games/[title]/analytics', () => {
  it('returns 200 with analytics data', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/games/Elden%20Ring/analytics'),
      { params: { title: 'Elden Ring' } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.gameTitle).toBe('Elden Ring');
  });

  it('calls getGameAnalytics with the decoded title', async () => {
    await GET(
      new NextRequest('http://localhost/api/games/Elden%20Ring/analytics'),
      { params: { title: 'Elden Ring' } },
    );
    expect(mockGetGameAnalytics).toHaveBeenCalledWith('Elden Ring');
  });

  it('returns platform breakdown and top terms', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/games/Elden%20Ring/analytics'),
      { params: { title: 'Elden Ring' } },
    );
    const body = await res.json();
    expect(body.analytics.platformBreakdown).toHaveLength(2);
    expect(body.analytics.topPros).toContain('great combat');
  });

  it('returns 500 on error', async () => {
    mockGetGameAnalytics.mockRejectedValue(new Error('DB error'));
    const res = await GET(
      new NextRequest('http://localhost/api/games/Elden%20Ring/analytics'),
      { params: { title: 'Elden Ring' } },
    );
    expect(res.status).toBe(500);
  });
});
