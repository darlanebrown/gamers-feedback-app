import { NextRequest, NextResponse } from 'next/server';
import { getFollowers } from '@/lib/followStore';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const [followers, session] = await Promise.all([
    getFollowers(params.tag),
    getSession(req),
  ]);

  return NextResponse.json({
    followers,
    total: followers.length,
    viewerTag: session?.gamerTag ?? null,
  });
}
