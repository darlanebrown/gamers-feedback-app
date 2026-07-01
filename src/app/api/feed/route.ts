import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFollowedTags } from '@/lib/followStore';
import { getReviewsByTags } from '@/lib/reviewStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const followedTags = await getFollowedTags(session.gamerTag);
  const reviews = await getReviewsByTags(followedTags);

  return NextResponse.json({ reviews, followedCount: followedTags.length });
}
