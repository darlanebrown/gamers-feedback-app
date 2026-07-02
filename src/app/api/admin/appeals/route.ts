import { NextRequest, NextResponse } from 'next/server';
import { getSession }  from '@/lib/auth';
import { getAppeals }  from '@/lib/appealStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const status  = req.nextUrl.searchParams.get('status') ?? 'pending';
  const appeals = await getAppeals(status);

  return NextResponse.json({ appeals, total: appeals.length });
}
