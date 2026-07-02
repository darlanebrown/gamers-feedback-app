import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { getUserById } from './userStore';

export async function requireNotBanned(req: NextRequest): Promise<NextResponse | null> {
  const session = await getSession(req);
  if (!session) return null;

  const user = await getUserById(session.id);
  if (!user) return null;

  if (user.banned) {
    return NextResponse.json({ error: 'Your account has been banned' }, { status: 403 });
  }

  return null;
}
