import { NextRequest, NextResponse } from 'next/server';
import { getSession }                          from '@/lib/auth';
import { findUserByTag, banUserByTag, unbanUserByTag } from '@/lib/userStore';
import { logSecurityEvent }                    from '@/lib/securityLogger';
import { createAuditEntry }                    from '@/lib/auditLogStore';
import { sendBanEmail, sendUnbanEmail }        from '@/lib/emailService';

type Params = { params: Promise<{ tag: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { tag } = await params;
  const target = await findUserByTag(tag);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.banned) return NextResponse.json({ error: 'User is already banned' }, { status: 409 });

  const { reason, bannedUntil } = await req.json().catch(() => ({}));

  const user = await banUserByTag(tag, {
    banReason:   reason   ? String(reason).trim() : undefined,
    bannedUntil: bannedUntil ? new Date(bannedUntil) : undefined,
  });

  const detail = `target: ${tag}${reason ? `, reason: ${reason}` : ''}`;
  logSecurityEvent('admin_ban', session.gamerTag, target.id, detail);
  createAuditEntry('admin_ban', session.gamerTag, target.id, detail).catch(() => {});
  sendBanEmail(target.email, target.gamerTag, {
    reason:      reason ? String(reason).trim() : undefined,
    bannedUntil: (user as any).bannedUntil ?? undefined,
  }).catch(() => {});

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { tag } = await params;
  const target = await findUserByTag(tag);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!target.banned) return NextResponse.json({ error: 'User is not banned' }, { status: 409 });

  const user = await unbanUserByTag(tag);

  const detail = `target: ${tag}`;
  logSecurityEvent('admin_unban', session.gamerTag, target.id, detail);
  createAuditEntry('admin_unban', session.gamerTag, target.id, detail).catch(() => {});
  sendUnbanEmail(target.email, target.gamerTag).catch(() => {});

  return NextResponse.json({ user });
}
