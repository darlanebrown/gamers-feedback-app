import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getNotifications,
  getUnreadCount,
  countNotifications,
  markAllRead,
  markRead,
  markManyRead,
} from '@/lib/notificationStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10));
  const skip  = (page - 1) * limit;

  const [notifications, unreadCount, total] = await Promise.all([
    getNotifications(session.gamerTag, { skip, take: limit }),
    getUnreadCount(session.gamerTag),
    countNotifications(session.gamerTag),
  ]);

  return NextResponse.json({ notifications, unreadCount, total, page, limit });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body — mark all read */ }

  const { id, ids } = body as { id?: string; ids?: unknown };

  if (ids !== undefined) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    await markManyRead(ids as string[]);
  } else if (id) {
    await markRead(id);
  } else {
    await markAllRead(session.gamerTag);
  }

  return NextResponse.json({ ok: true });
}
