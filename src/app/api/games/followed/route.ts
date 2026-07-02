import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByTag } from '@/lib/userStore';
import { getFollowedGames } from '@/lib/gameFollowStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUserByTag(session.gamerTag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const games = await getFollowedGames(user.id);
  return NextResponse.json({ games });
}
