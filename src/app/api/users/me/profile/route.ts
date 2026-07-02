import { NextRequest, NextResponse } from 'next/server';
import { getSession }      from '@/lib/auth';
import { updateUserByTag } from '@/lib/userStore';

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { displayName, bio } = await req.json().catch(() => ({}));

  const updates: Record<string, string | null> = {};

  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || !displayName.trim())
      return NextResponse.json({ error: 'displayName cannot be empty' }, { status: 400 });
    if (displayName.trim().length > 50)
      return NextResponse.json({ error: 'displayName must be 50 characters or fewer' }, { status: 400 });
    updates.displayName = displayName.trim();
  }

  if (bio !== undefined) {
    if (typeof bio === 'string' && bio.length > 300)
      return NextResponse.json({ error: 'bio must be 300 characters or fewer' }, { status: 400 });
    updates.bio = bio === '' ? null : (bio ?? null);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Provide at least one of: displayName, bio' }, { status: 400 });

  const user = await updateUserByTag(session.gamerTag, updates as any);
  return NextResponse.json({ user });
}
