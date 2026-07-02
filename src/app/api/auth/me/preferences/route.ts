import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getEmailPreferences,
  setEmailPreference,
  PREFERENCE_TYPES,
  type PreferenceType,
} from '@/lib/preferenceStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const preferences = await getEmailPreferences(session.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { type, enabled } = await req.json();

  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  if (!(PREFERENCE_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${PREFERENCE_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }

  await setEmailPreference(session.id, type as PreferenceType, enabled);
  const preferences = await getEmailPreferences(session.id);
  return NextResponse.json({ preferences });
}
