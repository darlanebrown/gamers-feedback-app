import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
} from '@/lib/notificationStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.gamerTag),
    getUnreadCount(session.gamerTag),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body?.id;
  } catch {
    // no body — mark all read
  }

  if (id) {
    await markRead(id);
  } else {
    await markAllRead(session.gamerTag);
  }

  return NextResponse.json({ ok: true });
}
