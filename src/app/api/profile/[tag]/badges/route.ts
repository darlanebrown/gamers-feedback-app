import { NextRequest, NextResponse } from 'next/server';
import { getUserBadges } from '@/lib/badgeService';

export async function GET(
  _req: NextRequest,
  { params }: { params: { tag: string } },
): Promise<NextResponse> {
  const badges = await getUserBadges(params.tag);
  return NextResponse.json({ badges, total: badges.length });
}
