import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { toggleBlock } from '@/lib/blockStore';

type Params = { params: Promise<{ tag: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { tag } = await params;
  if (tag === session.gamerTag)
    return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });

  const blocked = await toggleBlock(session.gamerTag, tag);
  return NextResponse.json({ blocked });
}
