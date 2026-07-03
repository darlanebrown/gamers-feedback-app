import { NextRequest, NextResponse } from 'next/server';
import { getSession }       from '@/lib/auth';
import { getUserByTag }     from '@/lib/userStore';
import { getFollowedGames } from '@/lib/gameFollowStore';
import { getGamesByTitles } from '@/lib/gameStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUserByTag(session.gamerTag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const titles = await getFollowedGames(user.id);
  if (titles.length === 0) return NextResponse.json({ games: [], total: 0 });

  const games = await getGamesByTitles(titles);
  return NextResponse.json({ games, total: games.length });
}
