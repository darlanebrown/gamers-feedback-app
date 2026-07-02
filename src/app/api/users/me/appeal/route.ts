import { NextRequest, NextResponse } from 'next/server';
import { getSession }              from '@/lib/auth';
import { getUserById }             from '@/lib/userStore';
import { createAppeal, hasAppeal } from '@/lib/appealStore';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await getUserById(session.id);
  if (!user?.banned) return NextResponse.json({ error: 'Your account is not banned' }, { status: 403 });

  const { message } = await req.json().catch(() => ({}));
  if (!message || typeof message !== 'string' || !message.trim())
    return NextResponse.json({ error: 'message is required' }, { status: 400 });

  const already = await hasAppeal(session.gamerTag);
  if (already) return NextResponse.json({ error: 'You have already submitted an appeal' }, { status: 409 });

  const appeal = await createAppeal(session.gamerTag, message.trim());
  return NextResponse.json({ appeal }, { status: 201 });
}
