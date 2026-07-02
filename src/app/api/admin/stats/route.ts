import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAdminStats } from '@/lib/adminStatsService';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const stats = await getAdminStats();
  return NextResponse.json({ stats });
}
