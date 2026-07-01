import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFollowedTags } from '@/lib/followStore';
import { getReviewsByTags, countReviewsByTags } from '@/lib/reviewStore';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10));
  const skip  = (page - 1) * limit;

  const followedTags = await getFollowedTags(session.gamerTag);
  const [reviews, total] = await Promise.all([
    getReviewsByTags(followedTags, { skip, take: limit }),
    countReviewsByTags(followedTags),
  ]);

  return NextResponse.json({
    reviews,
    total,
    page,
    limit,
    followedCount: followedTags.length,
  });
}
