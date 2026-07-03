import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { followUser, unfollowUser, isFollowing } from '@/lib/followStore';
import { findUserByTag } from '@/lib/userStore';
import { notifyNewFollower } from '@/lib/followNotificationService';
import { sendFollowEmail } from '@/lib/emailService';

export async function POST(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (session.gamerTag === params.tag)
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const target = await findUserByTag(params.tag);
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await followUser(session.gamerTag, params.tag);
  const following = await isFollowing(session.gamerTag, params.tag);
  notifyNewFollower(params.tag, session.gamerTag).catch(() => {});
  sendFollowEmail(target.email, session.gamerTag).catch(() => {});
  return NextResponse.json({ ok: true, following });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  await unfollowUser(session.gamerTag, params.tag);
  const following = await isFollowing(session.gamerTag, params.tag);
  return NextResponse.json({ ok: true, following });
}
