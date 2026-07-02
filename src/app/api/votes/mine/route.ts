import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getVotesByTag, type VoteType } from '@/lib/voteStore';

const VALID_TYPES = new Set<string>(['up', 'down']);

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const rawType = searchParams.get('type');
  if (rawType && !VALID_TYPES.has(rawType)) {
    return NextResponse.json({ error: 'type must be "up" or "down"' }, { status: 400 });
  }

  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10));
  const skip  = (page - 1) * limit;

  const votes = await getVotesByTag(session.gamerTag, {
    skip,
    take: limit,
    ...(rawType ? { type: rawType as VoteType } : {}),
  });

  return NextResponse.json({ votes });
}
