// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReviews,
  getHelpfulReviews,
  getReviewsByGame,
  addReview,
} from '@/lib/reviewStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get('game');
  const filter = searchParams.get('filter');

  let reviews;
  if (game) {
    reviews = getReviewsByGame(game);
  } else if (filter === 'helpful') {
    reviews = getHelpfulReviews();
  } else {
    reviews = getAllReviews();
  }

  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameTitle, platform, rating, headline,
      body: reviewBody, pros, cons, playtime, reviewerTag,
    } = body;

    // Validate required fields
    if (!gameTitle || !platform || !rating || !headline || !reviewBody || !reviewerTag) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 10' },
        { status: 400 }
      );
    }

    const review = addReview({
      gameTitle,
      platform,
      rating: Number(rating),
      headline,
      body: reviewBody,
      pros: pros || '',
      cons: cons || '',
      playtime: playtime || 'Unknown',
      reviewerTag,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
