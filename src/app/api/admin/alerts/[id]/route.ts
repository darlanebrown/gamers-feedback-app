import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { dismissAlert } from '@/lib/alertService';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const alert = await dismissAlert(params.id);
  return NextResponse.json({ alert });
}
