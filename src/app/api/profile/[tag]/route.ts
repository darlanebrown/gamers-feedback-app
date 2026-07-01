import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByTag, getGamesByReviewer } from '@/lib/reviewStore';
import { getFollowerCount, getFollowingCount, isFollowing } from '@/lib/followStore';
import { getSession } from '@/lib/auth';
import { findUserByTag } from '@/lib/userStore';

function computeReputation(reviews: { classification: string }[]) {
  const total = reviews.length;
  if (total === 0) return { score: 0, badge: null };
  const helpful = reviews.filter((r) => r.classification === 'helpful').length;
  const score = Math.round((helpful / total) * 100);
  const badge = score >= 80 ? 'Gold' : score >= 50 ? 'Silver' : 'Bronze';
  return { score, badge };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tag: string } },
) {
  const [reviews, followers, following, games, rawUser] = await Promise.all([
    getReviewsByTag(params.tag),
    getFollowerCount(params.tag),
    getFollowingCount(params.tag),
    getGamesByReviewer(params.tag),
    findUserByTag(params.tag),
  ]);

  const user = rawUser
    ? { displayName: rawUser.displayName, bio: rawUser.bio, gamerTag: rawUser.gamerTag }
    : null;

  const helpful = reviews.filter((r) => r.classification === 'helpful');
  const spam    = reviews.filter((r) => r.classification === 'spam');
  const toxic   = reviews.filter((r) => r.classification === 'toxic');
  const avgRating =
    helpful.length > 0
      ? helpful.reduce((sum, r) => sum + r.rating, 0) / helpful.length
      : 0;

  const session = await getSession(req);
  const viewerFollows = session
    ? await isFollowing(session.gamerTag, params.tag)
    : false;

  return NextResponse.json({
    gamerTag: params.tag,
    reviews,
    reputation: computeReputation(reviews),
    stats: {
      total: reviews.length,
      helpful: helpful.length,
      spam: spam.length,
      toxic: toxic.length,
      avgRating,
    },
    social: { followers, following, viewerFollows },
    games,
    user,
  });
}
