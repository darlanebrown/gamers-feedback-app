import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { addMute, removeMute, isMuted, getMutedTags } from '@/lib/muteStore';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const muted = await getMutedTags(session.gamerTag);
  return NextResponse.json({ muted });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mutedTag } = await req.json();
  if (!mutedTag || typeof mutedTag !== 'string') {
    return NextResponse.json({ error: 'mutedTag is required' }, { status: 400 });
  }
  if (mutedTag === session.gamerTag) {
    return NextResponse.json({ error: 'You cannot mute yourself' }, { status: 400 });
  }

  const already = await isMuted(session.gamerTag, mutedTag);
  if (already) {
    return NextResponse.json({ error: 'Already muted' }, { status: 409 });
  }

  await addMute(session.gamerTag, mutedTag);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mutedTag = searchParams.get('mutedTag');
  if (!mutedTag) return NextResponse.json({ error: 'mutedTag is required' }, { status: 400 });

  await removeMute(session.gamerTag, mutedTag);
  return NextResponse.json({ ok: true });
}
