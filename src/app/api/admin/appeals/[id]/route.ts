import { NextRequest, NextResponse } from 'next/server';
import { getSession }                          from '@/lib/auth';
import { getAppealById, reviewAppeal }         from '@/lib/appealStore';
import { unbanUserByTag }                      from '@/lib/userStore';
import { logSecurityEvent }                    from '@/lib/securityLogger';
import { createAuditEntry }                    from '@/lib/auditLogStore';

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ['approved', 'denied'] as const;
type ReviewStatus = typeof VALID_STATUSES[number];

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const existing = await getAppealById(id);
  if (!existing) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
  if (existing.reviewedAt)
    return NextResponse.json({ error: 'Appeal already reviewed' }, { status: 409 });

  const { status } = await req.json().catch(() => ({}));
  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: 'status must be approved or denied' }, { status: 400 });

  const appeal = await reviewAppeal(id, status as ReviewStatus);

  if (status === 'approved') {
    await unbanUserByTag(existing.gamerTag);
  }

  const eventType = status === 'approved' ? 'admin_appeal_approved' : 'admin_appeal_denied';
  const detail    = `appeal: ${id}, gamerTag: ${existing.gamerTag}`;
  logSecurityEvent(eventType as any, session.gamerTag, id, detail);
  createAuditEntry(eventType, session.gamerTag, id, detail).catch(() => {});

  return NextResponse.json({ appeal });
}
