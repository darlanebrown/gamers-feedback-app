import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraft, upsertDraft, deleteDraft, DraftFields } from '@/lib/draftStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const draft = await getDraft(session.gamerTag);
  return NextResponse.json({ draft });
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const fields = (await req.json()) as DraftFields;
  const draft = await upsertDraft(session.gamerTag, fields);
  return NextResponse.json({ draft });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await deleteDraft(session.gamerTag);
  return NextResponse.json({ ok: true });
}
