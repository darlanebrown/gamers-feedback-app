import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { findUserByTag, updateUserByTag } from '@/lib/userStore';
import { logSecurityEvent } from '@/lib/securityLogger';
import { createAuditEntry } from '@/lib/auditLogStore';
import { getSession } from '@/lib/auth';

const VALID_ACTIONS = new Set(['ban', 'unban', 'promote']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { action } = await req.json();

  if (!action || !VALID_ACTIONS.has(action))
    return NextResponse.json(
      { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(', ')}` },
      { status: 400 },
    );

  const user = await findUserByTag(params.tag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const update =
    action === 'ban'     ? { banned: true  } :
    action === 'unban'   ? { banned: false } :
                           { role: 'admin' };

  const updated = await updateUserByTag(params.tag, update);

  const session   = await getSession(req);
  const actor     = session?.gamerTag ?? 'unknown';
  const eventType = action === 'ban' ? 'admin_ban' : action === 'unban' ? 'admin_unban' : 'admin_promote';
  const detail    = `target: ${user.gamerTag}`;
  logSecurityEvent(eventType as any, actor, params.tag, detail);
  createAuditEntry(eventType, actor, params.tag, detail).catch(() => {});

  return NextResponse.json({ ok: true, user: updated });
}
