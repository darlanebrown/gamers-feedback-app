import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByTag } from '@/lib/userStore';
import { toggleGameFollow } from '@/lib/gameFollowStore';

type Params = { params: Promise<{ title: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { title } = await params;
  const user = await getUserByTag(session.gamerTag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const following = await toggleGameFollow(user.id, title);
  return NextResponse.json({ following });
}
