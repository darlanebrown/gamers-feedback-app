import { NextRequest, NextResponse } from 'next/server';
import { getSession }    from '@/lib/auth';
import { findUserByTag } from '@/lib/userStore';
import { createUserReport, hasReported } from '@/lib/userReportStore';
import { sendModerationEmail } from '@/lib/emailService';

type Params = { params: Promise<{ tag: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { tag } = await params;
  if (tag === session.gamerTag)
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 });

  const target = await findUserByTag(tag);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { reason } = await req.json();
  if (!reason || typeof reason !== 'string' || !reason.trim())
    return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  const already = await hasReported(session.gamerTag, tag);
  if (already) return NextResponse.json({ error: 'You have already reported this user' }, { status: 409 });

  await createUserReport(session.gamerTag, tag, reason.trim());
  sendModerationEmail(tag, session.gamerTag, reason.trim()).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
