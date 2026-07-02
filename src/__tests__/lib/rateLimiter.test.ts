import { RateLimiter, checkRateLimit } from '@/lib/rateLimiter';

describe('RateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = new RateLimiter({ limit: 5, windowMs: 60_000 });

    for (let i = 0; i < 5; i++) {
      expect(limiter.check('key1')).toBe(true);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 60_000 });

    limiter.check('key1');
    limiter.check('key1');
    limiter.check('key1');

    expect(limiter.check('key1')).toBe(false);
  });

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter({ limit: 2, windowMs: 60_000 });

    limiter.check('keyA');
    limiter.check('keyA');
    expect(limiter.check('keyA')).toBe(false);

    // keyB is unaffected
    expect(limiter.check('keyB')).toBe(true);
  });

  it('evicts timestamps outside the window', () => {
    jest.useFakeTimers();
    const limiter = new RateLimiter({ limit: 2, windowMs: 1_000 });

    limiter.check('key1');
    limiter.check('key1');
    expect(limiter.check('key1')).toBe(false);

    // advance past the window
    jest.advanceTimersByTime(1_100);

    // old timestamps evicted — slot opens up again
    expect(limiter.check('key1')).toBe(true);
    jest.useRealTimers();
  });

  it('returns remaining count via status()', () => {
    const limiter = new RateLimiter({ limit: 10, windowMs: 60_000 });

    limiter.check('key1');
    limiter.check('key1');

    expect(limiter.status('key1')).toEqual({ remaining: 8, limit: 10 });
  });
});

describe('checkRateLimit (singleton, 100 req/min)', () => {
  beforeEach(() => {
    // reset the singleton between tests by re-importing a fresh instance
    jest.resetModules();
  });

  it('returns allowed: true under the limit', async () => {
    const { checkRateLimit: fresh } = await import('@/lib/rateLimiter');
    const result = fresh('127.0.0.1');
    expect(result.allowed).toBe(true);
    expect(typeof result.remaining).toBe('number');
  });

  it('returns allowed: false when limit is exceeded', async () => {
    const { RateLimiter: FR } = await import('@/lib/rateLimiter');
    const limiter = new FR({ limit: 1, windowMs: 60_000 });
    limiter.check('ip');
    const allowed = limiter.check('ip');
    expect(allowed).toBe(false);
  });
});
