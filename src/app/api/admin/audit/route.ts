import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAuditLog } from '@/lib/auditLogStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') ?? undefined;
  const limit  = 50;
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const skip   = (page - 1) * limit;

  const entries = await getAuditLog({ action, limit, skip });
  return NextResponse.json({ entries });
}
