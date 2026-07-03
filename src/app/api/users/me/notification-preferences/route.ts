import { NextRequest, NextResponse } from 'next/server';
import { getSession }                          from '@/lib/auth';
import { getPreferences, upsertPreferences }   from '@/lib/notificationPrefStore';

const VALID_KEYS = new Set([
  'newFollower', 'tipReceived', 'commentOnReview', 'mention',
  'newGameReview', 'replyToComment', 'voteOnReview', 'reclassify',
]);

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const preferences = await getPreferences(session.gamerTag);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!VALID_KEYS.has(key))
      return NextResponse.json({ error: `Unknown preference key: "${key}"` }, { status: 400 });
    if (typeof value !== 'boolean')
      return NextResponse.json({ error: `Preference values must be boolean, got "${typeof value}" for "${key}"` }, { status: 400 });
    updates[key] = value;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'No preference fields provided' }, { status: 400 });

  const preferences = await upsertPreferences(session.gamerTag, updates);
  return NextResponse.json({ preferences });
}
