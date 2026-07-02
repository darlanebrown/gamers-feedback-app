import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByTag } from '@/lib/userStore';
import { bulkAddToWishlist } from '@/lib/wishlistStore';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { games } = body as { games?: unknown };

  if (!Array.isArray(games) || games.length === 0) {
    return NextResponse.json({ error: 'games must be a non-empty array' }, { status: 400 });
  }
  if (games.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 games per request' }, { status: 400 });
  }

  const user = await getUserByTag(session.gamerTag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const result = await bulkAddToWishlist(user.id, games as string[]);
  return NextResponse.json(result, { status: 201 });
}
