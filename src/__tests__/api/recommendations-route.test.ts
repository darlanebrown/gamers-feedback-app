import { GET } from '@/app/api/recommendations/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/recommendationsService', () => ({
  getRecommendations: jest.fn(),
}));

import { getRecommendations } from '@/lib/recommendationsService';

const mockGetRecs = getRecommendations as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  mockGetRecs.mockResolvedValue([]);
});

describe('GET /api/recommendations', () => {
  it('returns 400 when reviewerTag param is missing', async () => {
    const req = new NextRequest('http://localhost/api/recommendations');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with recommendations array', async () => {
    const req = new NextRequest('http://localhost/api/recommendations?reviewerTag=Darla%231');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it('calls getRecommendations with decoded tag and limit 6', async () => {
    const req = new NextRequest('http://localhost/api/recommendations?reviewerTag=Darla%231');
    await GET(req);
    expect(mockGetRecs).toHaveBeenCalledWith('Darla#1', 6);
  });

  it('returns 500 when getRecommendations throws', async () => {
    mockGetRecs.mockRejectedValue(new Error('DB error'));
    const req = new NextRequest('http://localhost/api/recommendations?reviewerTag=Darla%231');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
