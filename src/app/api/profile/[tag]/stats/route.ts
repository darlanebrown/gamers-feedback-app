import { NextRequest, NextResponse } from 'next/server';
import { getUserByTag } from '@/lib/userStore';
import { getUserReviewStats } from '@/lib/userReviewStatsService';

type Params = { params: Promise<{ tag: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tag } = await params;
  const user = await getUserByTag(tag);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const stats = await getUserReviewStats(tag);
  return NextResponse.json({ gamerTag: tag, ...stats });
}
