import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminMiddleware';
import { getAllUsers } from '@/lib/userStore';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const users = await getAllUsers();
  return NextResponse.json({ users, total: users.length });
}
