import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { dismissFlags, countFlags } from '@/lib/flagStore';

async function requireAdmin(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { reviewId: string } },
): Promise<NextResponse> {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const count = await countFlags(params.reviewId);
  return NextResponse.json({ count });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reviewId: string } },
): Promise<NextResponse> {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const dismissed = await dismissFlags(params.reviewId);
  return NextResponse.json({ ok: true, dismissed });
}
