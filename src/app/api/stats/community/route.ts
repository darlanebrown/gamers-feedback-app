import { NextResponse } from 'next/server';
import { getCommunityStats } from '@/lib/communityStatsService';

export async function GET() {
  const stats = await getCommunityStats();
  return NextResponse.json({ stats });
}
