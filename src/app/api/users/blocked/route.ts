import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getBlockedTags } from '@/lib/blockStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const blocked = await getBlockedTags(session.gamerTag);
  return NextResponse.json({ blocked });
}
