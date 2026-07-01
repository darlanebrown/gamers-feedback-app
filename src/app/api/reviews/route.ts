import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReviews,
  getHelpfulReviews,
  getReviewsByGame,
  addReview,
} from '@/lib/reviewStore';

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
  const game = searchParams.get('game');
  const filter = searchParams.get('filter');

  let reviews;
  if (game) {
    reviews = await getReviewsByGame(game);
  } else if (filter === 'helpful') {
    reviews = await getHelpfulReviews();
  } else {
    reviews = await getAllReviews();
  }

  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const error = validate(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const review = await addReview(body);
    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
