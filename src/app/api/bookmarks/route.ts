import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getBookmarks, countBookmarks } from '@/lib/bookmarkStore';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [bookmarks, total] = await Promise.all([
    getBookmarks(session.gamerTag),
    countBookmarks(session.gamerTag),
  ]);

  return NextResponse.json({ bookmarks, total });
}
