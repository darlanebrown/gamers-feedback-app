import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReviews,
  countAllReviews,
  getHelpfulReviews,
  countHelpfulReviews,
  getReviewsByGame,
  addReview,
  getRecentReviewCountByTag,
} from '@/lib/reviewStore';
import { checkForBombing } from '@/lib/alertService';
import { embedAndStore } from '@/lib/embeddingService';
import { notifyGameFollowers } from '@/lib/gameFollowNotificationService';
import { notifyMentions }     from '@/lib/mentionService';

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const VALID_PLATFORMS = [
  'PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S',
  'Xbox One', 'Nintendo Switch', 'Steam Deck', 'Mobile',
];

function validate(body: Record<string, unknown>): string | null {
  const { gameTitle, platform, rating, headline, body: reviewBody, reviewerTag } = body;

  if (typeof gameTitle !== 'string' || gameTitle.length < 2 || gameTitle.length > 100)
    return 'gameTitle must be 2–100 characters';
  if (!VALID_PLATFORMS.includes(platform as string))
    return `platform must be one of: ${VALID_PLATFORMS.join(', ')}`;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 10)
    return 'rating must be an integer between 1 and 10';
  if (typeof headline !== 'string' || headline.length < 5 || headline.length > 120)
    return 'headline must be 5–120 characters';
  if (typeof reviewBody !== 'string' || reviewBody.length < 20)
    return 'body must be at least 20 characters';
  if (typeof reviewerTag !== 'string' || reviewerTag.length < 2 || reviewerTag.length > 50)
    return 'reviewerTag must be 2–50 characters';

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game   = searchParams.get('game');
  const filter = searchParams.get('filter');
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip   = (page - 1) * limit;

  const hideSpoilers = searchParams.get('hideSpoilers') === 'true';

  // Game filter bypasses pagination (game pages handle their own sorting/display)
  if (game) {
    const all = await getReviewsByGame(game);
    let reviews = all.filter((r) => r.classification === 'helpful');
    if (hideSpoilers) reviews = reviews.filter((r) => !r.hasSpoilers);
    return NextResponse.json({ reviews });
  }

  // Default and filter=helpful both show only moderation-approved reviews
  let [reviews, total] = await Promise.all([
    getHelpfulReviews({ skip, take: limit }),
    countHelpfulReviews(),
  ]);
  if (hideSpoilers) reviews = reviews.filter((r) => !r.hasSpoilers);
  return NextResponse.json({ reviews, total, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const error = validate(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const recentCount = await getRecentReviewCountByTag(body.reviewerTag as string, since);
    if (recentCount >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 3 reviews per hour.', retryAfter: 3600 },
        { status: 429 },
      );
    }

    const review = await addReview(body);
    checkForBombing(review.gameTitle).catch(() => {});
    notifyGameFollowers(review.gameTitle, review.id, review.reviewerTag).catch(() => {});
    notifyMentions(review.body, review.id, review.reviewerTag).catch(() => {});
    if (process.env.OPENAI_API_KEY) embedAndStore(review).catch(() => {});
    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
