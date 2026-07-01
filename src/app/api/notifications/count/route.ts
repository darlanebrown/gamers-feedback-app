import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUnreadCount } from '@/lib/notificationStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unreadCount = await getUnreadCount(session.gamerTag);
  return NextResponse.json({ unreadCount });
}
