import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFlaggedReviews } from '@/lib/flagStore';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const flagged = await getFlaggedReviews();
  return NextResponse.json({ flagged, total: flagged.length });
}
