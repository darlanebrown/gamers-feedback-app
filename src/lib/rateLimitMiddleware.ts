import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { checkRateLimit } from './rateLimiter';
import { logSecurityEvent } from './securityLogger';

type Handler = (req: NextRequest) => Promise<Response>;

export async function withRateLimit(req: NextRequest, handler: Handler): Promise<Response> {
  const session = await getSession(req);
  const key = session?.gamerTag ?? (req.headers.get('x-forwarded-for') ?? 'unknown');

  const { allowed, remaining } = checkRateLimit(key);

  if (!allowed) {
    logSecurityEvent('rate_limit_exceeded', key, req.url);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: 60 },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const res = await handler(req);

  // clone to add header — Response headers are immutable after construction
  const headers = new Headers(res.headers);
  headers.set('X-RateLimit-Remaining', String(remaining));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
