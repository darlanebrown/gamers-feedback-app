import { NextRequest, NextResponse } from 'next/server';
import { getSession }                       from '@/lib/auth';
import { getReportById, resolveUserReport } from '@/lib/userReportStore';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const existing = await getReportById(id);
  if (!existing) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  if (existing.resolvedAt) return NextResponse.json({ error: 'Report already resolved' }, { status: 409 });

  const { resolution } = await req.json();
  if (!resolution || typeof resolution !== 'string' || !resolution.trim())
    return NextResponse.json({ error: 'resolution is required' }, { status: 400 });

  const report = await resolveUserReport(id, resolution.trim());
  return NextResponse.json({ report });
}
