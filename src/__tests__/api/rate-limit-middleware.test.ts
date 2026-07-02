jest.mock('@/lib/rateLimiter', () => ({
  checkRateLimit: jest.fn(),
  RateLimiter: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  SESSION_COOKIE: 'gf_session',
}));

import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/rateLimitMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { getSession } from '@/lib/auth';

const mockCheck      = checkRateLimit as jest.Mock;
const mockGetSession = getSession     as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  const rl = jest.requireMock('@/lib/rateLimiter') as Record<string, jest.Mock>;
  rl.checkRateLimit.mockReturnValue({ allowed: true, remaining: 99 });
});

function makeReq(ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/reviews', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('withRateLimit', () => {
  it('calls the handler when under the limit', async () => {
    mockGetSession.mockResolvedValue(null);
    const handler = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));

    const res = await withRateLimit(makeReq(), handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('returns 429 when limit is exceeded', async () => {
    mockGetSession.mockResolvedValue(null);
    mockCheck.mockReturnValue({ allowed: false, remaining: 0 });

    const handler = jest.fn();
    const res = await withRateLimit(makeReq(), handler);

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.retryAfter).toBe(60);
  });

  it('keys by gamerTag when authenticated', async () => {
    mockGetSession.mockResolvedValue({ id: 'u1', gamerTag: 'Darla#1' });

    const handler = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    await withRateLimit(makeReq(), handler);

    expect(mockCheck).toHaveBeenCalledWith('Darla#1');
  });

  it('keys by IP when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const handler = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    await withRateLimit(makeReq('10.0.0.1'), handler);

    expect(mockCheck).toHaveBeenCalledWith('10.0.0.1');
  });

  it('includes Retry-After and X-RateLimit-Remaining headers on 429', async () => {
    mockGetSession.mockResolvedValue(null);
    mockCheck.mockReturnValue({ allowed: false, remaining: 0 });

    const res = await withRateLimit(makeReq(), jest.fn());

    expect(res.headers.get('Retry-After')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('includes X-RateLimit-Remaining header on successful requests', async () => {
    mockGetSession.mockResolvedValue(null);
    mockCheck.mockReturnValue({ allowed: true, remaining: 42 });

    const handler = jest.fn().mockResolvedValue(
      new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    );
    const res = await withRateLimit(makeReq(), handler);

    expect(res.headers.get('X-RateLimit-Remaining')).toBe('42');
  });
});
