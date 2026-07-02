import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/userStore';
import { getReviewsByTag } from '@/lib/reviewStore';
import { getBookmarks } from '@/lib/bookmarkStore';
import { getNotifications } from '@/lib/notificationStore';
import { getFollowers, getFollowedTags } from '@/lib/followStore';
import { getMutedTags } from '@/lib/muteStore';
import { getCollections } from '@/lib/collectionStore';
import { getUserBadges } from '@/lib/badgeService';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, reviews, bookmarks, notifications, followers, following, muted, collections, badges] =
    await Promise.all([
      getUserById(session.id),
      getReviewsByTag(session.gamerTag),
      getBookmarks(session.gamerTag),
      getNotifications(session.gamerTag),
      getFollowers(session.gamerTag),
      getFollowedTags(session.gamerTag),
      getMutedTags(session.gamerTag),
      getCollections(session.gamerTag),
      getUserBadges(session.gamerTag),
    ]);

  const { passwordHash: _, ...profile } = (user ?? {}) as any;

  const bundle = {
    exportedAt: new Date().toISOString(),
    profile,
    reviews,
    bookmarks,
    notifications,
    followers,
    following,
    muted,
    collections,
    badges,
  };

  const filename = `gamers-feedback-export-${session.gamerTag.replace('#', '-')}.json`;

  return NextResponse.json(bundle, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
