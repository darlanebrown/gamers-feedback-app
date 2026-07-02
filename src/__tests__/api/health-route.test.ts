jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';

const mockQuery = prisma.$queryRaw as jest.Mock;

function makeReq() {
  return new NextRequest('http://localhost/api/health');
}

beforeEach(() => jest.resetAllMocks());

describe('GET /api/health', () => {
  it('returns 200 with status ok when DB is reachable', async () => {
    mockQuery.mockResolvedValue([{ '?column?': 1 }]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('includes a valid ISO timestamp', async () => {
    mockQuery.mockResolvedValue([{ '?column?': 1 }]);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('returns 503 with status error when DB is unreachable', async () => {
    mockQuery.mockRejectedValue(new Error('Connection refused'));
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.error).toMatch(/database/i);
  });

  it('calls $queryRaw to ping the database', async () => {
    mockQuery.mockResolvedValue([{ '?column?': 1 }]);
    await GET(makeReq());
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
