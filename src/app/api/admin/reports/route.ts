import { NextRequest, NextResponse } from 'next/server';
import { getSession }    from '@/lib/auth';
import { getUserReports } from '@/lib/userReportStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const reportedTag = searchParams.get('reportedTag') ?? undefined;
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const take = parseInt(searchParams.get('take') ?? '50', 10);

  const reports = await getUserReports({ reportedTag, skip, take });
  return NextResponse.json({ reports, total: reports.length });
}
