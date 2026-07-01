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
    const review = await addReview(body);
    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
