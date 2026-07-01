import { NextRequest, NextResponse } from 'next/server';
import { getFollowedTags } from '@/lib/followStore';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const [following, session] = await Promise.all([
    getFollowedTags(params.tag),
    getSession(req),
  ]);

  return NextResponse.json({
    following,
    total: following.length,
    viewerTag: session?.gamerTag ?? null,
  });
}
