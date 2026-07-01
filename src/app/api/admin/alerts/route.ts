import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getActiveAlerts } from '@/lib/alertService';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const alerts = await getActiveAlerts();
  return NextResponse.json({ alerts });
}
