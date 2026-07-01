import { NextRequest, NextResponse } from 'next/server';
import { getGameAnalytics } from '@/lib/gameAnalytics';

export async function GET(
  _req: NextRequest,
  { params }: { params: { title: string } },
) {
  try {
    const analytics = await getGameAnalytics(params.title);
    return NextResponse.json({ analytics });
  } catch {
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
