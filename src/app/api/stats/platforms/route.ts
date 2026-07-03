import { NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/platformStatsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const platforms = await getPlatformStats();
  return NextResponse.json({ platforms });
}
