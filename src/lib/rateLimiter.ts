export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, number[]>();

  constructor({ limit, windowMs }: { limit: number; windowMs: number }) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const hits = (this.store.get(key) ?? []).filter((t) => t > cutoff);
    if (hits.length >= this.limit) {
      this.store.set(key, hits);
      return false;
    }
    hits.push(now);
    this.store.set(key, hits);
    return true;
  }

  status(key: string): { remaining: number; limit: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const hits = (this.store.get(key) ?? []).filter((t) => t > cutoff);
    return { remaining: Math.max(0, this.limit - hits.length), limit: this.limit };
  }
}

const globalLimiter = new RateLimiter({ limit: 100, windowMs: 60_000 });

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const allowed = globalLimiter.check(key);
  const { remaining } = globalLimiter.status(key);
  return { allowed, remaining };
}
