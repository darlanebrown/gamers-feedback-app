jest.mock('@/lib/autoFeaturedService', () => ({
  autoSelectFeaturedReview: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cron/featured/route';
import { autoSelectFeaturedReview } from '@/lib/autoFeaturedService';

const mockAutoSelect = autoSelectFeaturedReview as jest.Mock;

const SECRET = 'cron-secret-abc';

function makeReq(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers['authorization'] = authHeader;
  return new NextRequest('http://localhost/api/cron/featured', { method: 'POST', headers });
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env.CRON_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('POST /api/cron/featured', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await POST(makeReq('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(401);
  });

  it('auto-selects and returns the featured review id', async () => {
    mockAutoSelect.mockResolvedValue('rev42');
    const res = await POST(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reviewId).toBe('rev42');
    expect(mockAutoSelect).toHaveBeenCalledTimes(1);
  });

  it('returns ok with null reviewId when no eligible review found', async () => {
    mockAutoSelect.mockResolvedValue(null);
    const res = await POST(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reviewId).toBeNull();
  });
});
