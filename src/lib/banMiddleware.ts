import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { getUserById, unbanUserByTag } from './userStore';

export async function requireNotBanned(req: NextRequest): Promise<NextResponse | null> {
  const session = await getSession(req);
  if (!session) return null;

  const user = await getUserById(session.id);
  if (!user) return null;

  if (!user.banned) return null;

  const until = (user as any).bannedUntil as Date | null;
  if (until && until.getTime() <= Date.now()) {
    await unbanUserByTag(user.gamerTag);
    return null;
  }

  return NextResponse.json(
    { error: 'Your account has been banned', ...(until ? { bannedUntil: until.toISOString() } : {}) },
    { status: 403 },
  );
}
