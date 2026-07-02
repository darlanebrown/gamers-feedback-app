jest.mock('@/lib/digestService', () => ({
  runWeeklyDigest: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cron/digest/route';
import { runWeeklyDigest } from '@/lib/digestService';

const mockRunDigest = runWeeklyDigest as jest.Mock;

const SECRET = 'test-cron-secret';

function makeReq(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers['authorization'] = authHeader;
  return new NextRequest('http://localhost/api/cron/digest', {
    method: 'POST',
    headers,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env.CRON_SECRET = SECRET;
  mockRunDigest.mockResolvedValue({ sent: 3, skipped: 1 });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('POST /api/cron/digest', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await POST(makeReq('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 200 and runs the digest with correct secret', async () => {
    const res = await POST(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(3);
    expect(body.skipped).toBe(1);
    expect(mockRunDigest).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when CRON_SECRET env var is not set', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(401);
  });
});
