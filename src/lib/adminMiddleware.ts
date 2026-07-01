import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const session = await getSession(req);
  if (!session)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  return null;
}
